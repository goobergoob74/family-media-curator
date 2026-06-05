/**
 * Family Media Curator — Preload Script
 * Exposes safe APIs to renderer via contextBridge
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('fmc', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // File system
  browseFolder: () => ipcRenderer.invoke('browse-folder'),
  browseDest: () => ipcRenderer.invoke('browse-dest'),
  getDrives: () => ipcRenderer.invoke('get-drives'),
  getFolderChildren: (folderPath: string) => ipcRenderer.invoke('get-folder-children', folderPath),
  getFolderFiles: (folderPath: string) => ipcRenderer.invoke('get-folder-files', folderPath),
  openFolder: (folderPath: string) => ipcRenderer.invoke('open-folder', folderPath),
  getFileInfo: (filePath: string) => ipcRenderer.invoke('get-file-info', filePath),

  // Database
  getFiles: (limit: number, offset: number) => ipcRenderer.invoke('db-get-files', limit, offset),
  getFileCount: () => ipcRenderer.invoke('db-get-file-count'),
  getRuns: (limit: number) => ipcRenderer.invoke('db-get-runs', limit),
  getStats: () => ipcRenderer.invoke('db-get-stats'),

  // Scanner
  startScan: (config: any) => ipcRenderer.invoke('start-scan', config),
  stopScan: () => ipcRenderer.invoke('stop-scan'),
  onProgress: (callback: (data: any) => void) => { ipcRenderer.on('scan-progress', (_, data) => callback(data)); },
  offProgress: () => { ipcRenderer.removeAllListeners('scan-progress'); },
  onComplete: (callback: (data: any) => void) => { ipcRenderer.on('scan-complete', (_, data) => callback(data)); },
  offComplete: () => { ipcRenderer.removeAllListeners('scan-complete'); },

  // Organization
  generatePlan: (config: any) => ipcRenderer.invoke('generate-plan', config),
  executePlan: (plans: any[], execute: boolean) => ipcRenderer.invoke('execute-plan', plans, execute),
  getNoDateFiles: () => ipcRenderer.invoke('get-no-date-files'),

  // State
  save: (state: any) => ipcRenderer.invoke('save-state', state),
  load: () => ipcRenderer.invoke('load-state'),

  // App info
  getVersion: () => ipcRenderer.invoke('get-version'),
  getPlatform: () => process.platform,
});
