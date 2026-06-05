export interface DateCandidate {
  source: DateSource;
  date: Date;
  hasSeconds: boolean;
  subsecMs: string;
  timezoneSuffix?: string;
}

export type DateSource =
  | 'exif:DateTimeOriginal'
  | 'exif:CreateDate'
  | 'exif:MediaCreateDate'
  | 'exif:TrackCreateDate'
  | 'exif:ModifyDate'
  | 'fs:created'
  | 'fs:modified'
  | 'name:parsed';

export interface DateSourcePriority {
  source: DateSource;
  priority: number;
}

export const DATE_SOURCE_PRIORITIES: Record<DateSource, number> = {
  'exif:DateTimeOriginal': 0,
  'exif:CreateDate': 0,
  'exif:MediaCreateDate': 0,
  'exif:TrackCreateDate': 0,
  'exif:ModifyDate': 10,
  'fs:created': 20,
  'fs:modified': 30,
  'name:parsed': 90,
};

export interface DateExtractionResult {
  chosenDate: Date | null;
  source: DateSource | null;
  hasSeconds: boolean;
  subsecMs: string;
  candidates: DateCandidate[];
  discrepancy?: DateDiscrepancy;
}

export interface DateDiscrepancy {
  detected: boolean;
  chosenSource: DateSource;
  otherSource: DateSource;
  chosenDate: Date;
  otherDate: Date;
  deltaDays: number;
  tier: 1 | 2 | 3 | 4;
  message: string;
}

export const FILENAME_DATE_PATTERNS = [
  // yyyy-MM-dd HH.mm.ss(.sss)
  /^(?<y>\d{4})[-_.](?<m>\d{2})[-_.](?<d>\d{2})[\s_.T-]+(?<hh>\d{2})[-_.](?<mm>\d{2})([-_.](?<ss>\d{2}))?(\.(?<ms>\d{3}))?/,
  // yyyymmddHHMMSS(.sss)
  /^(?<y>\d{4})(?<m>\d{2})(?<d>\d{2})(?<hh>\d{2})(?<mm>\d{2})(?<ss>\d{2})(?<ms>\d{3})?/,
  // yyyy-MM-dd only
  /^(?<y>\d{4})[-_.](?<m>\d{2})[-_.](?<d>\d{2})/,
  // yyyymmdd only
  /^(?<y>\d{4})(?<m>\d{2})(?<d>\d{2})/,
];

export const EXIF_DATE_FORMATS = [
  'yyyy:MM:dd HH:mm:ss',
  'yyyy:MM:dd HH:mm',
  'yyyy-MM-dd HH:mm:ss',
  'yyyy-MM-dd HH:mm',
  'yyyy:MM:dd HH.mm.ss',
  'yyyy-MM-dd HH.mm.ss',
];

export const DEFAULT_MIN_YEAR = 1990;
export const DEFAULT_ROGUE_DISCREPANCY_YEARS = 5;
export const FILENAME_TIER_HOURS = 48;
export const FILENAME_TIER_DAYS_1 = 7;
export const FILENAME_TIER_DAYS_2 = 30;
