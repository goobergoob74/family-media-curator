/**
 * Duplicate Detection Service
 * Finds exact and near-duplicate files using hash-based comparison.
 */

import * as fs from 'fs';
import * as path from 'path';
import { DatabaseService } from './DatabaseService';
import type { DuplicateConfig } from '../../shared/types';

export interface DuplicateGroup {
  id: string;
  hash: string;
  files: DuplicateFile[];
  winnerIndex: number;
  winnerBasis: string;
}

export interface DuplicateFile {
  path: string;
  filename: string;
  size: number;
  mediaType: 'photo' | 'video';
  width?: number;
  height?: number;
  duration?: number;
  bitrate?: number;
}

export class DuplicateDetectionService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  /**
   * Find all duplicate groups in the database.
   */
  findDuplicates(config: DuplicateConfig): DuplicateGroup[] {
    const db = this.db.getDb();

    // Find files with matching hashes
    const duplicates = db.prepare(`
      SELECT hash, COUNT(*) as count FROM files
      WHERE hash IS NOT NULL
      GROUP BY hash
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `).all() as any[];

    const groups: DuplicateGroup[] = [];

    for (const dup of duplicates) {
      const files = db.prepare(`
        SELECT id, path, filename, hash, size, media_type, metadata_json
        FROM files WHERE hash = ?
        ORDER BY filename
      `).all(dup.hash) as any[];

      const dupFiles: DuplicateFile[] = files.map((f: any) => {
        let meta: any = {};
        if (f.metadata_json) {
          try { meta = JSON.parse(f.metadata_json); } catch { /* ignore */ }
        }
        return {
          path: f.path,
          filename: f.filename,
          size: f.size,
          mediaType: f.media_type,
          width: meta.width,
          height: meta.height,
          duration: meta.duration,
          bitrate: meta.bitrate,
        };
      });

      // Determine winner
      const { winnerIndex, basis } = this.selectWinner(dupFiles);

      groups.push({
        id: `${dup.hash}-${Date.now()}`,
        hash: dup.hash,
        files: dupFiles,
        winnerIndex,
        winnerBasis: basis,
      });
    }

    return groups;
  }

  /**
   * Select the winner from a group of duplicates.
   * Photos: pixels > PPI > file size
   * Videos: duration > bitrate > pixels > file size
   */
  private selectWinner(files: DuplicateFile[]): { winnerIndex: number; basis: string } {
    if (files.length === 1) return { winnerIndex: 0, basis: 'OnlyCandidate' };

    const isPhoto = files[0].mediaType === 'photo';

    if (isPhoto) {
      // Find max pixels
      let maxPixels = 0;
      let winnerIdx = 0;
      for (let i = 0; i < files.length; i++) {
        const pixels = (files[i].width || 0) * (files[i].height || 0);
        if (pixels > maxPixels) {
          maxPixels = pixels;
          winnerIdx = i;
        }
      }
      if (maxPixels > 0) return { winnerIndex: winnerIdx, basis: 'Pixels' };

      // Find largest file
      let maxSize = 0;
      for (let i = 0; i < files.length; i++) {
        if (files[i].size > maxSize) {
          maxSize = files[i].size;
          winnerIdx = i;
        }
      }
      return { winnerIndex: winnerIdx, basis: 'FileSizeBytes' };
    } else {
      // Video: duration > bitrate > file size
      let winnerIdx = 0;

      // Try duration
      let maxDuration = 0;
      for (let i = 0; i < files.length; i++) {
        if ((files[i].duration || 0) > maxDuration) {
          maxDuration = files[i].duration || 0;
          winnerIdx = i;
        }
      }
      if (maxDuration > 0) return { winnerIndex: winnerIdx, basis: 'DurationSeconds' };

      // Try bitrate
      let maxBitrate = 0;
      for (let i = 0; i < files.length; i++) {
        if ((files[i].bitrate || 0) > maxBitrate) {
          maxBitrate = files[i].bitrate || 0;
          winnerIdx = i;
        }
      }
      if (maxBitrate > 0) return { winnerIndex: winnerIdx, basis: 'BitrateBps' };

      // File size
      let maxSize = 0;
      for (let i = 0; i < files.length; i++) {
        if (files[i].size > maxSize) {
          maxSize = files[i].size;
          winnerIdx = i;
        }
      }
      return { winnerIndex: winnerIdx, basis: 'FileSizeBytes' };
    }
  }

  /**
   * Get duplicate statistics.
   */
  getStats(): { groups: number; totalDuplicates: number; wastedSpace: number } {
    const db = this.db.getDb();

    const dupHashes = db.prepare(`
      SELECT hash, COUNT(*) as count, SUM(size) as total_size
      FROM files WHERE hash IS NOT NULL
      GROUP BY hash HAVING COUNT(*) > 1
    `).all() as any[];

    let totalDuplicates = 0;
    let wastedSpace = 0;

    for (const dup of dupHashes) {
      totalDuplicates += dup.count - 1; // All but the winner
      // Wasted space = total size - winner size (approximate)
      const files = db.prepare(
        'SELECT size FROM files WHERE hash = ? ORDER BY size DESC'
      ).all(dup.hash) as any[];
      for (let i = 1; i < files.length; i++) {
        wastedSpace += files[i].size;
      }
    }

    return { groups: dupHashes.length, totalDuplicates, wastedSpace };
  }
}
