import { create } from 'zustand';

interface AppStats {
  total: number;
  photos: number;
  videos: number;
  organized: number;
  duplicates: number;
}

interface AppState {
  version: string;
  stats: AppStats;
  scanProgress: any;
  isScanning: boolean;
  logLines: string[];

  setVersion: (version: string) => void;
  loadStats: () => Promise<void>;
  setScanProgress: (progress: any) => void;
  setIsScanning: (scanning: boolean) => void;
  addLogLine: (line: string) => void;
  clearLog: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  version: '0.0.1',
  stats: { total: 0, photos: 0, videos: 0, organized: 0, duplicates: 0 },
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

  setScanProgress: (progress) => set({ scanProgress: progress }),

  setIsScanning: (scanning) => set({ isScanning: scanning }),

  addLogLine: (line) =>
    set((state) => ({
      logLines: [...state.logLines.slice(-500), line],
    })),

  clearLog: () => set({ logLines: [] }),
}));
