/**
 * File Scanner Service
 * Scans directories for media files, extracts metadata, and populates the database.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import exifr from 'exifr';
import { DatabaseService } from './DatabaseService';
import { DateExtractor, ExtractionInput } from '../../shared/date-engine/DateExtractor';
import type { ScanConfig, ScanProgress, MediaType } from '../../shared/types';

// Supported extensions
const PHOTO_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.tif', '.tiff', '.bmp', '.webp',
  '.heic', '.heif', '.dng', '.arw', '.cr2', '.cr3', '.nef', '.orf',
  '.rw2', '.raf', '.sr2', '.pef', '.avif',
]);

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mov', '.m4v', '.avi', '.mkv', '.wmv', '.mpg', '.mpeg',
  '.mts', '.m2ts', '.3gp', '.3g2', '.webm', '.flv',
]);

const ALL_EXTENSIONS = new Set([...PHOTO_EXTENSIONS, ...VIDEO_EXTENSIONS]);

export class FileScannerService {
  private db: DatabaseService;
  private dateExtractor: DateExtractor;
  private abortController: AbortController | null = null;

  constructor(db: DatabaseService) {
    this.db = db;
    this.dateExtractor = new DateExtractor();
  }

  /**
   * Scan a directory for media files and catalog them.
   */
  async scan(
    config: ScanConfig,
    onProgress: (progress: ScanProgress) => void
  ): Promise<ScanProgress> {
    this.abortController = new AbortController();
    const startTime = Date.now();

    const progress: ScanProgress = {
      phase: 'scanning',
      filesScanned: 0,
      filesTotal: 0,
      filesProcessed: 0,
      filesSkipped: 0,
      duplicatesFound: 0,
      errors: [],
      elapsedSeconds: 0,
    };

    try {
      // Phase 1: Scan files
      onProgress({ ...progress, phase: 'scanning' });
      const files = await this.scanDirectory(config.rootPath, config.recurse, config.maxFiles);
      progress.filesTotal = files.length;
      onProgress({ ...progress, filesTotal: files.length });

      if (files.length === 0) {
        progress.phase = 'done';
        progress.elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
        onProgress({ ...progress });
        return progress;
      }

      // Phase 2: Extract metadata and catalog
      progress.phase = 'extracting_metadata';
      onProgress({ ...progress });

      for (let i = 0; i < files.length; i++) {
        if (this.abortController.signal.aborted) {
          progress.phase = 'done';
          progress.errors.push('Scan cancelled by user');
          break;
        }

        const filePath = files[i];
        progress.currentFile = filePath;
        progress.filesScanned = i + 1;
        progress.elapsedSeconds = Math.round((Date.now() - startTime) / 1000);

        try {
          await this.processFile(filePath);
          progress.filesProcessed++;
        } catch (err: any) {
          progress.errors.push(`${path.basename(filePath)}: ${err.message}`);
          progress.filesSkipped++;
        }

        // Report progress every 5 files
        if (i % 5 === 0) {
          onProgress({ ...progress });
        }
      }

      // Phase 3: Check for duplicates
      progress.phase = 'checking_duplicates';
      progress.currentFile = undefined;
      onProgress({ ...progress });
      progress.duplicatesFound = this.countDuplicates();

      progress.phase = 'done';
      progress.elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
      onProgress({ ...progress });

      return progress;
    } catch (err: any) {
      progress.phase = 'done';
      progress.errors.push(`Fatal error: ${err.message}`);
      onProgress({ ...progress });
      return progress;
    }
  }

  stop(): void {
    this.abortController?.abort();
  }

  private async scanDirectory(
    rootPath: string,
    recurse: boolean,
    maxFiles: number
  ): Promise<string[]> {
    const files: string[] = [];
    const queue: string[] = [rootPath];

    while (queue.length > 0 && (maxFiles === 0 || files.length < maxFiles)) {
      const currentDir = queue.shift()!;

      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        if (maxFiles > 0 && files.length >= maxFiles) break;

        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          if (recurse) {
            queue.push(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (ALL_EXTENSIONS.has(ext)) {
            files.push(fullPath);
          }
        }
      }
    }

    return files;
  }

  private async processFile(filePath: string): Promise<void> {
    const stat = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const filename = path.basename(filePath);
    const mediaType: MediaType = PHOTO_EXTENSIONS.has(ext) ? 'photo' : 'video';

    // Compute file hash (first 64KB for speed)
    const hash = await this.computeHash(filePath, stat.size);

    // Build extraction input with filesystem dates
    const extractionInput: ExtractionInput = {
      fsCreated: stat.birthtime,
      fsModified: stat.mtime,
      filename,
    };

    // Extract EXIF metadata for photos using exifr
    let metadataJson: string | undefined;
    if (PHOTO_EXTENSIONS.has(ext)) {
      try {
        const exif = await exifr.parse(filePath, {
          tiff: true,
          exif: true,
          gps: true,
          iptc: true,
          icc: true,
          jfif: true,
          ifd1: true,
        });

        if (exif) {
          // Feed EXIF dates into the extraction engine
          extractionInput.exifDateTimeOriginal = exif.DateTimeOriginal?.toISOString?.() ?? undefined;
          extractionInput.exifCreateDate = exif.CreateDate?.toISOString?.() ?? undefined;
          extractionInput.exifModifyDate = exif.ModifyDate?.toISOString?.() ?? undefined;

          // Subsecond time
          if (exif.SubSecTimeOriginal) {
            extractionInput.exifSubsecTime = String(exif.SubSecTimeOriginal);
          }

          // Store metadata summary
          metadataJson = JSON.stringify({
            make: exif.Make,
            model: exif.Model,
            width: exif.ImageWidth ?? exif.ExifImageWidth,
            height: exif.ImageHeight ?? exif.ExifImageHeight,
            iso: exif.ISO,
            focalLength: exif.FocalLength,
            aperture: exif.FNumber,
            shutterSpeed: exif.ShutterSpeedValue,
            orientation: exif.Orientation,
            gps: exif.latitude && exif.longitude ? {
              latitude: exif.latitude,
              longitude: exif.longitude,
              altitude: exif.GPSAltitude,
            } : undefined,
          });
        }
      } catch {
        // exifr can't parse this file — continue with filesystem dates
      }
    }

    // Extract date using the date engine
    const dateResult = this.dateExtractor.extract(extractionInput);

    // Insert into database
    this.db.insertFile({
      path: filePath,
      filename,
      extension: ext,
      size: stat.size,
      mtime: stat.mtime.toISOString(),
      hash,
      mediaType,
      dateExtracted: dateResult.chosenDate?.toISOString(),
      dateSource: dateResult.source ?? undefined,
      isOrganized: false,
      metadataJson,
    });
  }

  private async computeHash(filePath: string, fileSize: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath, { highWaterMark: 65536 });

      let bytesRead = 0;
      const maxBytes = fileSize > 10 * 1024 * 1024 ? 65536 : fileSize;

      stream.on('data', (chunk: any) => {
        if (bytesRead < maxBytes) {
          const remaining = maxBytes - bytesRead;
          hash.update(chunk.subarray(0, Math.min(chunk.length, remaining)));
          bytesRead += chunk.length;
        }
      });

      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private countDuplicates(): number {
    const db = this.db.getDb();
    const row = db.prepare(`
      SELECT COUNT(*) as count FROM files
      WHERE hash IN (
        SELECT hash FROM files WHERE hash IS NOT NULL GROUP BY hash HAVING COUNT(*) > 1
      )
    `).get() as any;
    return row?.count ?? 0;
  }
}
