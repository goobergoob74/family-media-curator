import {
  DateCandidate,
  DateSource,
  FILENAME_DATE_PATTERNS,
  EXIF_DATE_FORMATS,
  DEFAULT_MIN_YEAR,
} from './types';

/**
 * Parses date strings from various sources into Date objects.
 * Handles EXIF date formats, filesystem dates, and filename-parsed dates.
 */
export class DateParser {
  /**
   * Parse an EXIF date string into a DateCandidate.
   * EXIF dates typically use colons: "2024:01:15 14:30:22"
   */
  static parseExifDate(
    value: string | undefined,
    subsec?: string,
    source: DateSource = 'exif:DateTimeOriginal'
  ): DateCandidate | null {
    if (!value || !value.trim()) return null;

    const raw = value.trim();
    let tzSuffix: string | undefined;

    // Extract timezone suffix if present
    const tzMatch = raw.match(/([+-]\d{2}:\d{2}|Z)$/);
    if (tzMatch) {
      tzSuffix = tzMatch[1];
    }

    // Remove timezone for base parsing
    const v = raw.replace(/([+-]\d{2}:\d{2}|Z)$/, '');

    for (const fmt of EXIF_DATE_FORMATS) {
      try {
        const dt = DateParser.parseExact(v, fmt);
        if (!dt) continue;

        // Apply timezone offset
        if (tzSuffix && tzSuffix !== 'Z') {
          const sign = tzSuffix.startsWith('-') ? -1 : 1;
          const hh = parseInt(tzSuffix.substring(1, 3), 10);
          const mm = parseInt(tzSuffix.substring(4, 6), 10);
          const offsetMs = sign * (hh * 60 + mm) * 60 * 1000;
          dt.setTime(dt.getTime() + offsetMs);
        }

        const hasSeconds = fmt.includes('ss');
        let ms = '';
        if (subsec && /^\d{1,3}$/.test(subsec)) {
          ms = subsec.padStart(3, '0');
        }

        return { source, date: dt, hasSeconds, subsecMs: ms, timezoneSuffix: tzSuffix };
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Parse a filename for embedded date patterns.
   * Supports: yyyy-MM-dd HH.mm.ss, yyyymmddHHMMSS, etc.
   */
  static parseFilenameDate(filename: string): DateCandidate | null {
    const base = filename.replace(/\.[^.]+$/, ''); // Remove extension

    for (const pattern of FILENAME_DATE_PATTERNS) {
      const match = base.match(pattern);
      if (!match || !match.groups) continue;

      const y = parseInt(match.groups.y, 10);
      const m = parseInt(match.groups.m, 10);
      const d = parseInt(match.groups.d, 10);

      if (y < DEFAULT_MIN_YEAR || m < 1 || m > 12 || d < 1 || d > 31) continue;

      let hh = 0, mm = 0, ss = 0;
      let hasSeconds = false;
      let ms = '';

      if (match.groups.hh) {
        hh = parseInt(match.groups.hh, 10);
        mm = parseInt(match.groups.mm, 10);
        if (match.groups.ss) {
          ss = parseInt(match.groups.ss, 10);
          hasSeconds = true;
        }
        if (match.groups.ms) {
          ms = match.groups.ms;
        }
      }

      const dt = new Date(y, m - 1, d, hh, mm, ss);
      if (isNaN(dt.getTime())) continue;

      return { source: 'name:parsed', date: dt, hasSeconds, subsecMs: ms };
    }

    return null;
  }

  /**
   * Parse a filesystem date (birthtime or mtime) into a DateCandidate.
   */
  static parseFilesystemDate(
    date: Date,
    source: DateSource
  ): DateCandidate | null {
    if (!date || isNaN(date.getTime())) return null;
    if (date.getFullYear() < DEFAULT_MIN_YEAR) return null;
    return { source, date, hasSeconds: true, subsecMs: '' };
  }

  /**
   * Parse an exact date string using a format pattern.
   * Supports: yyyy, MM, dd, HH, mm, ss
   */
  private static parseExact(value: string, format: string): Date | null {
    const formatParts = format.match(/yyyy|MM|dd|HH|mm|ss/g);
    if (!formatParts) return null;

    // Build regex from format
    let regexStr = format
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace('yyyy', '(\\d{4})')
      .replace('MM', '(\\d{2})')
      .replace('dd', '(\\d{2})')
      .replace('HH', '(\\d{2})')
      .replace('mm', '(\\d{2})')
      .replace('ss', '(\\d{2})');

    const match = value.match(new RegExp(`^${regexStr}$`));
    if (!match) return null;

    const values = match.slice(1).map((v) => parseInt(v, 10));
    let idx = 0;
    let year = 0, month = 0, day = 0, hour = 0, minute = 0, second = 0;

    for (const part of formatParts) {
      const val = values[idx++];
      switch (part) {
        case 'yyyy': year = val; break;
        case 'MM': month = val; break;
        case 'dd': day = val; break;
        case 'HH': hour = val; break;
        case 'mm': minute = val; break;
        case 'ss': second = val; break;
      }
    }

    const dt = new Date(year, month - 1, day, hour, minute, second);
    return isNaN(dt.getTime()) ? null : dt;
  }
}
