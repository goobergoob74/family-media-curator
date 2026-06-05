/**
 * Type declarations for the Electron preload bridge (window.fmc)
 */

declare global {
  interface Window {
    fmc: {
      // Window controls
      minimize: () => void;
      maximize: () => void;
      close: () => void;

      // File system
      browseFolder: () => Promise<string | null>;
      browseDest: () => Promise<string | null>;
      getDrives: () => Promise<Array<{ letter: string; path: string; label: string }>>;
      getFolderChildren: (folderPath: string) => Promise<Array<{ name: string; path: string; hasChildren: boolean }>>;
      getFolderFiles: (folderPath: string) => Promise<Array<{ name: string; path: string; size: number }>>;
      openFolder: (folderPath: string) => Promise<{ success: boolean; error?: string }>;
      getFileInfo: (filePath: string) => Promise<any>;

      // Database
      getFiles: (limit: number, offset: number) => Promise<any[]>;
      getFileCount: () => Promise<number>;
      getRuns: (limit: number) => Promise<any[]>;
      getStats: () => Promise<{ total: number; photos: number; videos: number; organized: number; duplicates: number }>;

      // Scanner
      startScan: (config: any) => Promise<any>;
      stopScan: () => void;
      onProgress: (callback: (data: any) => void) => void;
      offProgress: () => void;
      onComplete: (callback: (data: any) => void) => void;
      offComplete: () => void;

      // State
      save: (state: any) => Promise<boolean>;
      load: () => Promise<any>;

      // App info
      getVersion: () => Promise<string>;
      getPlatform: () => string;
    };
  }
}

export {};
