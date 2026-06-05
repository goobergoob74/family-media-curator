import {
  DateCandidate,
  DateSource,
  DateExtractionResult,
  DateDiscrepancy,
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
  // EXIF dates — can be ISO strings (from exiftool) or JS Date objects (from exifr)
  exifDateTimeOriginal?: string | Date;
  exifCreateDate?: string | Date;
  exifMediaCreateDate?: string | Date;
  exifTrackCreateDate?: string | Date;
  exifModifyDate?: string | Date;
  exifSubsecTime?: string;
  // Filesystem dates
  fsCreated?: Date;
  fsModified?: Date;
  // Filename for date parsing
  filename: string;
}

function toDate(value: string | Date | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  // Try parsing as ISO string
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function dateToCandidate(
  date: Date,
  source: DateSource,
  subsec?: string
): DateCandidate | null {
  if (!date || isNaN(date.getTime())) return null;
  if (date.getFullYear() < DEFAULT_MIN_YEAR) return null;
  return {
    source,
    date,
    hasSeconds: true,
    subsecMs: subsec || '',
  };
}

/**
 * Date extraction engine that implements the full fallback chain.
 * Ported from MediaTidy(claude) v1.2.4 with enhancements.
 *
 * Accepts both EXIF date strings (from exiftool) and JS Date objects (from exifr).
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

    // 1. EXIF DateTimeOriginal (highest priority) — exifr returns Date objects
    if (input.exifDateTimeOriginal) {
      const d = toDate(input.exifDateTimeOriginal);
      const c = dateToCandidate(d!, 'exif:DateTimeOriginal', input.exifSubsecTime);
      if (c) candidates.push(c);
    }

    // 2. EXIF CreateDate
    if (input.exifCreateDate) {
      const d = toDate(input.exifCreateDate);
      const c = dateToCandidate(d!, 'exif:CreateDate');
      if (c) candidates.push(c);
    }

    // 3. EXIF MediaCreateDate / TrackCreateDate (videos)
    if (input.exifMediaCreateDate) {
      const d = toDate(input.exifMediaCreateDate);
      const c = dateToCandidate(d!, 'exif:MediaCreateDate');
      if (c) candidates.push(c);
    }
    if (input.exifTrackCreateDate) {
      const d = toDate(input.exifTrackCreateDate);
      const c = dateToCandidate(d!, 'exif:TrackCreateDate');
      if (c) candidates.push(c);
    }

    // 4. EXIF ModifyDate
    if (input.exifModifyDate) {
      const d = toDate(input.exifModifyDate);
      const c = dateToCandidate(d!, 'exif:ModifyDate');
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

  private checkDiscrepancy(
    chosen: DateCandidate,
    allCandidates: DateCandidate[]
  ): DateDiscrepancy | null {
    for (const other of allCandidates) {
      if (other.source === chosen.source) continue;

      const deltaMs = Math.abs(chosen.date.getTime() - other.date.getTime());
      const deltaDays = deltaMs / (1000 * 60 * 60 * 24);
      const deltaYears = deltaDays / 365;

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
