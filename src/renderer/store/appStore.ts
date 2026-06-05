import { create } from 'zustand';

export type OperationMode = 'sort' | 'rename' | 'tidy';
export type CollisionPolicy = 'ranked' | 'dupsFolder' | 'keepNewest' | 'keepLargest';

export interface ScanConfig {
  rootPath: string;
  destPath: string;
  videoDestPath: string;
  mode: OperationMode;
  recurse: boolean;
  maxFiles: number;
  collisionPolicy: CollisionPolicy;
  minYear: number;
  execute: boolean;
  suffixMode: 'all' | 'smart' | 'none';
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

interface AppStats {
  total: number;
  photos: number;
  videos: number;
  organized: number;
  duplicates: number;
}

interface LogEntry {
  timestamp: string;
  type: 'info' | 'warn' | 'error' | 'success';
  text: string;
}

interface AppState {
  version: string;
  stats: AppStats;
  scanConfig: ScanConfig;
  scanProgress: ScanProgress | null;
  isScanning: boolean;
  logLines: LogEntry[];

  setVersion: (version: string) => void;
  loadStats: () => Promise<void>;
  setScanConfig: (config: Partial<ScanConfig>) => void;
  startScan: () => Promise<void>;
  stopScan: () => void;
  setScanProgress: (progress: ScanProgress) => void;
  setIsScanning: (scanning: boolean) => void;
  addLogLine: (type: LogEntry['type'], text: string) => void;
  clearLog: () => void;
}

const defaultScanConfig: ScanConfig = {
  rootPath: '',
  destPath: '',
  videoDestPath: '',
  mode: 'tidy',
  recurse: true,
  maxFiles: 500,
  collisionPolicy: 'ranked',
  minYear: 1990,
  execute: false,
  suffixMode: 'smart',
};

export const useAppStore = create<AppState>((set, get) => ({
  version: '0.0.1',
  stats: { total: 0, photos: 0, videos: 0, organized: 0, duplicates: 0 },
  scanConfig: { ...defaultScanConfig },
  scanProgress: null,
  isScanning: false,
  logLines: [],

  setVersion: (version) => set({ version }),

  loadStats: async () => {
    try {
      const stats = await window.fmc.getStats();
      if (stats) set({ stats });
    } catch {
      // Database may not be ready yet
    }
  },

  setScanConfig: (config) =>
    set((state) => ({
      scanConfig: { ...state.scanConfig, ...config },
    })),

  startScan: async () => {
    const { scanConfig } = get();
    if (!scanConfig.rootPath) {
      get().addLogLine('error', 'No source folder selected');
      return;
    }
    if ((scanConfig.mode === 'sort' || scanConfig.mode === 'tidy') && !scanConfig.destPath) {
      get().addLogLine('error', 'Destination folder required for Sort/Tidy mode');
      return;
    }

    set({ isScanning: true, scanProgress: null });
    get().addLogLine('info', `Starting scan: ${scanConfig.rootPath}`);
    get().addLogLine('info', `Mode: ${scanConfig.mode} | Recurse: ${scanConfig.recurse} | Max: ${scanConfig.maxFiles || 'unlimited'}`);

    // Set up progress listener
    window.fmc.onProgress((data: ScanProgress) => {
      set({ scanProgress: data });
      if (data.phase === 'done') {
        set({ isScanning: false });
        get().addLogLine('success', `Scan complete. Found ${data.filesScanned} files, ${data.duplicatesFound} duplicates.`);
        get().loadStats();
      }
    });

    window.fmc.onComplete((data: any) => {
      set({ isScanning: false });
      get().addLogLine('success', `Scan finished: ${data.filesProcessed} processed, ${data.filesSkipped} skipped`);
      get().loadStats();
    });

    try {
      await window.fmc.startScan(scanConfig);
    } catch (err: any) {
      set({ isScanning: false });
      get().addLogLine('error', `Scan failed: ${err.message}`);
    }
  },

  stopScan: () => {
    window.fmc.stopScan();
    set({ isScanning: false });
    get().addLogLine('warn', 'Scan cancelled by user');
  },

  setScanProgress: (progress) => set({ scanProgress: progress }),

  setIsScanning: (scanning) => set({ isScanning: scanning }),

  addLogLine: (type, text) =>
    set((state) => ({
      logLines: [
        ...state.logLines.slice(-500),
        { timestamp: new Date().toLocaleTimeString(), type, text },
      ],
    })),

  clearLog: () => set({ logLines: [] }),
}));
