import {
  DateCandidate,
  DateSource,
  DateExtractionResult,
  DateDiscrepancy,
  DateSourcePriority,
  DATE_SOURCE_PRIORITIES,
  DEFAULT_MIN_YEAR,
  DEFAULT_ROGUE_DISCREPANCY_YEARS,
  FILENAME_TIER_HOURS,
  FILENAME_TIER_DAYS_1,
  FILENAME_TIER_DAYS_2,
} from './types';
import { DateParser } from './DateParser';

export interface ExtractionOptions {
  minYear?: number;
  rogueDiscrepancyYears?: number;
  filenameTierHours?: number;
  filenameTierDays1?: number;
  filenameTierDays2?: number;
}

export interface ExtractionInput {
  exifDateTimeOriginal?: string;
  exifCreateDate?: string;
  exifMediaCreateDate?: string;
  exifTrackCreateDate?: string;
  exifModifyDate?: string;
  exifSubsecTime?: string;
  fsCreated?: Date;
  fsModified?: Date;
  filename: string;
}

/**
 * Date extraction engine that implements the full fallback chain.
 * Ported from MediaTidy(claude) v1.2.4 with enhancements.
 */
export class DateExtractor {
  private options: Required<ExtractionOptions>;

  constructor(options: ExtractionOptions = {}) {
    this.options = {
      minYear: options.minYear ?? DEFAULT_MIN_YEAR,
      rogueDiscrepancyYears: options.rogueDiscrepancyYears ?? DEFAULT_ROGUE_DISCREPANCY_YEARS,
      filenameTierHours: options.filenameTierHours ?? FILENAME_TIER_HOURS,
      filenameTierDays1: options.filenameTierDays1 ?? FILENAME_TIER_DAYS_1,
      filenameTierDays2: options.filenameTierDays2 ?? FILENAME_TIER_DAYS_2,
    };
  }

  /**
   * Extract the best date from all available sources.
   * Returns the earliest valid date with full provenance.
   */
  extract(input: ExtractionInput): DateExtractionResult {
    const candidates: DateCandidate[] = [];

    // 1. EXIF DateTimeOriginal (highest priority)
    if (input.exifDateTimeOriginal) {
      const c = DateParser.parseExifDate(
        input.exifDateTimeOriginal,
        input.exifSubsecTime,
        'exif:DateTimeOriginal'
      );
      if (c) candidates.push(c);
    }

    // 2. EXIF CreateDate
    if (input.exifCreateDate) {
      const c = DateParser.parseExifDate(input.exifCreateDate, undefined, 'exif:CreateDate');
      if (c) candidates.push(c);
    }

    // 3. EXIF MediaCreateDate / TrackCreateDate (videos)
    if (input.exifMediaCreateDate) {
      const c = DateParser.parseExifDate(input.exifMediaCreateDate, undefined, 'exif:MediaCreateDate');
      if (c) candidates.push(c);
    }
    if (input.exifTrackCreateDate) {
      const c = DateParser.parseExifDate(input.exifTrackCreateDate, undefined, 'exif:TrackCreateDate');
      if (c) candidates.push(c);
    }

    // 4. EXIF ModifyDate
    if (input.exifModifyDate) {
      const c = DateParser.parseExifDate(input.exifModifyDate, undefined, 'exif:ModifyDate');
      if (c) candidates.push(c);
    }

    // 5. Filesystem creation time
    if (input.fsCreated) {
      const c = DateParser.parseFilesystemDate(input.fsCreated, 'fs:created');
      if (c) candidates.push(c);
    }

    // 6. Filesystem modification time
    if (input.fsModified) {
      const c = DateParser.parseFilesystemDate(input.fsModified, 'fs:modified');
      if (c) candidates.push(c);
    }

    // 7. Filename-parsed date (lowest priority)
    const fnc = DateParser.parseFilenameDate(input.filename);
    if (fnc) candidates.push(fnc);

    if (candidates.length === 0) {
      return {
        chosenDate: null,
        source: null,
        hasSeconds: false,
        subsecMs: '',
        candidates: [],
      };
    }

    // Sort by priority (lower = better), then by date (earlier = better)
    candidates.sort((a, b) => {
      const prioA = DATE_SOURCE_PRIORITIES[a.source] ?? 999;
      const prioB = DATE_SOURCE_PRIORITIES[b.source] ?? 999;
      if (prioA !== prioB) return prioA - prioB;
      return a.date.getTime() - b.date.getTime();
    });

    const chosen = candidates[0];

    // Check for rogue date discrepancy
    const discrepancy = this.checkDiscrepancy(chosen, candidates);

    return {
      chosenDate: chosen.date,
      source: chosen.source,
      hasSeconds: chosen.hasSeconds,
      subsecMs: chosen.subsecMs,
      candidates,
      discrepancy: discrepancy?.detected ? discrepancy : undefined,
    };
  }

  /**
   * Check if the chosen date has significant discrepancy with other candidates.
   */
  private checkDiscrepancy(
    chosen: DateCandidate,
    allCandidates: DateCandidate[]
  ): DateDiscrepancy | null {
    for (const other of allCandidates) {
      if (other.source === chosen.source) continue;

      const deltaMs = Math.abs(chosen.date.getTime() - other.date.getTime());
      const deltaDays = deltaMs / (1000 * 60 * 60 * 24);
      const deltaYears = deltaDays / 365;

      // Rogue: chosen date is years earlier than another candidate
      if (deltaYears >= this.options.rogueDiscrepancyYears) {
        return {
          detected: true,
          chosenSource: chosen.source,
          otherSource: other.source,
          chosenDate: chosen.date,
          otherDate: other.date,
          deltaDays,
          tier: 4,
          message: `Date discrepancy: ${chosen.source} (${chosen.date.toISOString()}) is ${Math.round(deltaYears)} years different from ${other.source} (${other.date.toISOString()})`,
        };
      }
    }

    return null;
  }

  /**
   * Get filename discrepancy tier when filename date differs from chosen date.
   */
  static getFilenameDiscrepancyTier(
    nameDate: Date | null,
    chosenDate: Date | null,
    tiers = { hours: FILENAME_TIER_HOURS, days1: FILENAME_TIER_DAYS_1, days2: FILENAME_TIER_DAYS_2 }
  ): { deltaHours: number; deltaDays: number; tier: 0 | 1 | 2 | 3 | 4 } {
    if (!nameDate || !chosenDate) {
      return { deltaHours: 0, deltaDays: 0, tier: 0 };
    }

    const deltaMs = Math.abs(chosenDate.getTime() - nameDate.getTime());
    const deltaHours = deltaMs / (1000 * 60 * 60);
    const deltaDays = deltaMs / (1000 * 60 * 60 * 24);

    let tier: 0 | 1 | 2 | 3 | 4 = 0;
    if (deltaDays > tiers.days2) tier = 4;
    else if (deltaDays > tiers.days1) tier = 3;
    else if (deltaHours > tiers.hours) tier = 2;
    else if (deltaHours > 0) tier = 1;

    return { deltaHours, deltaDays, tier };
  }
}
