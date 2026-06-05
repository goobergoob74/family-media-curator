/**
 * Organization Service
 * Handles file moving, copying, and renaming based on the organization plan.
 * Generates the plan from scanned files and executes it.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { DatabaseService } from './DatabaseService';
import { DateExtractor, ExtractionInput } from '../../shared/date-engine/DateExtractor';
import type { ScanConfig, OrganizationPlan, MediaType } from '../../shared/types';

const PHOTO_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.tif', '.tiff', '.bmp', '.webp',
  '.heic', '.heif', '.dng', '.arw', '.cr2', '.cr3', '.nef', '.orf',
  '.rw2', '.raf', '.sr2', '.pef', '.avif',
]);

export interface OrganizationResult {
  success: boolean;
  operationsApplied: number;
  operationsSkipped: number;
  errors: string[];
  noDateFiles: string[];
}

export class OrganizationService {
  private db: DatabaseService;
  private dateExtractor: DateExtractor;

  constructor(db: DatabaseService) {
    this.db = db;
    this.dateExtractor = new DateExtractor();
  }

  /**
   * Generate an organization plan from the database.
   */
  generatePlan(config: ScanConfig): OrganizationPlan[] {
    const db = this.db.getDb();
    const files = db.prepare(`
      SELECT * FROM files WHERE is_organized = 0 ORDER BY path
    `).all() as any[];

    const plans: OrganizationPlan[] = [];

    for (const file of files) {
      const plan = this.planFile(file, config);
      if (plan) plans.push(plan);
    }

    return plans;
  }

  /**
   * Execute the organization plan.
   */
  executePlan(
    plans: OrganizationPlan[],
    execute: boolean
  ): OrganizationResult {
    const result: OrganizationResult = {
      success: true,
      operationsApplied: 0,
      operationsSkipped: 0,
      errors: [],
      noDateFiles: [],
    };

    for (const plan of plans) {
      if (plan.action === 'skip') {
        result.operationsSkipped++;
        continue;
      }

      if (!execute) {
        // Dry run — just count
        result.operationsApplied++;
        continue;
      }

      try {
        // Ensure destination directory exists
        const destDir = path.dirname(plan.destinationPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }

        // Handle destination collision
        let finalDest = plan.destinationPath;
        if (fs.existsSync(finalDest)) {
          finalDest = this.getUniquePath(finalDest);
        }

        if (plan.action === 'move') {
          fs.renameSync(plan.sourcePath, finalDest);
        } else if (plan.action === 'copy') {
          fs.copyFileSync(plan.sourcePath, finalDest);
        } else if (plan.action === 'rename') {
          fs.renameSync(plan.sourcePath, finalDest);
        }

        // Update database
        const db = this.db.getDb();
        db.prepare('UPDATE files SET is_organized = 1, path = ? WHERE path = ?')
          .run(finalDest, plan.sourcePath);

        result.operationsApplied++;
      } catch (err: any) {
        result.errors.push(`${plan.sourcePath}: ${err.message}`);
        result.success = false;
      }
    }

    return result;
  }

  private planFile(file: any, config: ScanConfig): OrganizationPlan | null {
    const ext = file.extension?.toLowerCase() || '';
    const mediaType: MediaType = PHOTO_EXTENSIONS.has(ext) ? 'photo' : 'video';

    // Parse metadata if available
    let metadata: any = {};
    if (file.metadata_json) {
      try { metadata = JSON.parse(file.metadata_json); } catch { /* ignore */ }
    }

    // Build extraction input
    const extractionInput: ExtractionInput = {
      fsCreated: file.mtime ? new Date(file.mtime) : undefined,
      fsModified: file.mtime ? new Date(file.mtime) : undefined,
      filename: file.filename,
    };

    // Use existing date if already extracted
    let date: Date | null = null;
    let dateSource = file.date_source;

    if (file.date_extracted) {
      date = new Date(file.date_extracted);
    } else {
      const result = this.dateExtractor.extract(extractionInput);
      date = result.chosenDate;
      dateSource = result.source;
    }

    // No date found
    if (!date) {
      return {
        id: crypto.randomUUID(),
        sourcePath: file.path,
        destinationPath: '',
        action: 'skip',
      };
    }

    // Determine destination path
    const destPath = this.buildDestinationPath(
      date,
      file.filename,
      ext,
      mediaType,
      config
    );

    // Check if file is already in the correct location
    if (file.path === destPath) {
      return {
        id: crypto.randomUUID(),
        sourcePath: file.path,
        destinationPath: destPath,
        action: 'skip',
      };
    }

    // Determine action based on mode
    let action: 'move' | 'copy' | 'rename' = 'move';
    if (config.mode === 'rename') {
      action = 'rename';
    } else if (config.mode === 'sort') {
      action = 'move';
    } else {
      // Tidy mode: move + rename
      action = 'move';
    }

    return {
      id: crypto.randomUUID(),
      sourcePath: file.path,
      destinationPath: destPath,
      action,
      originalDate: file.date_extracted,
      newDate: date.toISOString(),
    };
  }

  private buildDestinationPath(
    date: Date,
    originalFilename: string,
    ext: string,
    mediaType: MediaType,
    config: ScanConfig
  ): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    const mediaTypeLabel = mediaType === 'video' ? 'Videos' : 'Photos';
    const yearFolder = `${year}_${mediaTypeLabel}`;
    const monthFolder = `${year}_${month}_${mediaTypeLabel}`;

    // Build filename: YYYY-MM-DD HH.mm.ss
    const baseName = `${year}-${month}-${day} ${hours}.${minutes}.${seconds}`;

    // Add suffix if smart mode
    let suffix = '';
    if (config.suffixMode !== 'none') {
      const originalBase = originalFilename.replace(ext, '');
      suffix = this.extractSuffix(originalBase, config.suffixMode);
    }

    const destRoot = mediaType === 'video' && config.videoDestPath
      ? config.videoDestPath
      : (config.destPath || path.dirname(originalFilename));

    const destFolder = path.join(destRoot, yearFolder, monthFolder);
    return path.join(destFolder, `${baseName}${suffix}${ext}`);
  }

  private extractSuffix(baseName: string, mode: 'all' | 'smart' | 'none'): string {
    if (mode === 'none') return '';

    // Strip leading date patterns
    let cleaned = baseName
      .replace(/^\d{4}[-_.]\d{2}[-_.]\d{2}[\s_.T-]+\d{2}[-_.]\d{2}([-_.]\d{2})?(\.\d{3})?\s*/, '')
      .replace(/^\d{8}[\s_.T-]*\d{6}(\d{3})?\s*/, '')
      .replace(/^\d{4}[-_.]\d{2}[-_.]\d{2}\s*/, '')
      .trim();

    if (!cleaned || !/[A-Za-z]/.test(cleaned)) return '';

    // Sanitize
    cleaned = cleaned
      .replace(/[^\w\s-]+/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    if (!cleaned) return '';

    if (mode === 'smart') {
      // Filter generic camera patterns
      if (/^(IMG|DSC|DCIM|DSC_|IMG_)\d+$/.test(cleaned)) return '';
      if (cleaned.length === 1) return '';
    }

    return `_${cleaned}`;
  }

  private getUniquePath(filePath: string): string {
    if (!fs.existsSync(filePath)) return filePath;

    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    let counter = 1;

    while (fs.existsSync(path.join(dir, `${base} (${counter})${ext}`))) {
      counter++;
    }

    return path.join(dir, `${base} (${counter})${ext}`);
  }
}
