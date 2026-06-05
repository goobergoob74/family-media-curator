/** Core domain types shared between main and renderer processes */

export type MediaType = 'photo' | 'video';

export type OperationMode = 'sort' | 'rename' | 'tidy';

export type CollisionPolicy = 'ranked' | 'dupsFolder' | 'keepNewest' | 'keepLargest';

export interface MediaFile {
  id?: number;
  path: string;
  filename: string;
  extension: string;
  size: number;
  mtime: string;
  hash?: string;
  phash?: string;
  mediaType: MediaType;
  dateExtracted?: string;
  dateSource?: string;
  isOrganized: boolean;
  metadata?: MediaMetadata;
}

export interface MediaMetadata {
  make?: string;
  model?: string;
  dateTimeOriginal?: string;
  createDate?: string;
  modifyDate?: string;
  width?: number;
  height?: number;
  duration?: number;
  bitrate?: number;
  fps?: number;
  codec?: string;
  iso?: number;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  gps?: GpsData;
  orientation?: number;
}

export interface GpsData {
  latitude: number;
  longitude: number;
  altitude?: number;
}

export interface DateCandidate {
  source: string;
  date: string;
  hasSeconds: boolean;
  subsecMs?: string;
}

export interface OrganizationPlan {
  id: string;
  sourcePath: string;
  destinationPath: string;
  action: 'move' | 'copy' | 'rename' | 'skip';
  originalDate?: string;
  newDate?: string;
  suffix?: string;
}

export interface DuplicateGroup {
  id: string;
  hash: string;
  files: string[];
  winnerIndex: number;
  winnerBasis: string;
}

export interface ScanConfig {
  rootPath: string;
  destPath?: string;
  videoDestPath?: string;
  mode: OperationMode;
  recurse: boolean;
  maxFiles: number;
  collisionPolicy: CollisionPolicy;
  minYear: number;
  rogueDateDiscrepancyYears: number;
  suffixMode: 'all' | 'smart' | 'none';
  execute: boolean;
}

export interface ScanProgress {
  phase: 'scanning' | 'extracting_metadata' | 'building_plan' | 'checking_duplicates' | 'applying' | 'done';
  currentFile?: string;
  filesScanned: number;
  filesTotal: number;
  filesProcessed: number;
  filesSkipped: number;
  duplicatesFound: number;
  errors: string[];
  elapsedSeconds: number;
}

export interface JobConfig {
  id: string;
  scanConfig: ScanConfig;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'cancelled' | 'error';
  progress: ScanProgress;
  plan: OrganizationPlan[];
  duplicateGroups: DuplicateGroup[];
  startTime?: string;
  endTime?: string;
  error?: string;
}

export interface DuplicateConfig {
  algorithm: 'sha256' | 'phash';
  threshold: number;
  policy: CollisionPolicy;
  moveDupsToFolder: boolean;
  maxWinnersPerCollision: number;
}

export interface AppState {
  version: string;
  lastOpenedAt: string;
  mode: OperationMode;
  collisionPolicy: CollisionPolicy;
  theme: string;
  batchLimit: number;
  batchLimitUnlocked: boolean;
  sourceHistory: string[];
  destHistory: string[];
  windowBounds?: { x: number; y: number; width: number; height: number };
  panelLayout: PanelLayout;
}

export interface PanelLayout {
  navigatorWidth: number;
  previewWidth: number;
  jobsWidth: number;
  navigatorVisible: boolean;
  previewVisible: boolean;
  jobsVisible: boolean;
}

export interface FaceData {
  id?: number;
  fileId: number;
  descriptor: number[];
  x: number;
  y: number;
  width: number;
  height: number;
  personId?: number;
  confidence: number;
}

export interface Person {
  id?: number;
  name: string;
  createdAt: string;
}

export interface RunRecord {
  id?: number;
  startedAt: string;
  endedAt?: string;
  mode: string;
  sourcePath: string;
  destPath?: string;
  filesFound: number;
  filesProcessed: number;
  filesSkipped: number;
  duplicatesFound: number;
  status: string;
  reportPath?: string;
}
