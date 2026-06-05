/**
 * IPC Handlers — Bridge between renderer and main process
 */

import { BrowserWindow, ipcMain, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DatabaseService } from '../services/DatabaseService';
import { FileScannerService } from '../services/FileScannerService';
import { OrganizationService } from '../services/OrganizationService';
import type { ScanConfig } from '../../shared/types';

const APP_VERSION = '0.0.1';

interface HandlerContext {
  db: DatabaseService;
  scanner: FileScannerService;
  organizer: OrganizationService;
  mainWindowGetter: () => BrowserWindow | null;
}

export function registerIpcHandlers(ctx: HandlerContext): void {
  const { db, scanner, organizer, mainWindowGetter } = ctx;

  // --- Window controls ---
  ipcMain.on('window-minimize', () => mainWindowGetter()?.minimize());
  ipcMain.on('window-maximize', () => {
    const win = mainWindowGetter();
    if (win) win.isMaximized() ? win.unmaximize() : win.maximize();
  });
  ipcMain.on('window-close', () => mainWindowGetter()?.close());

  // --- App info ---
  ipcMain.handle('get-version', () => APP_VERSION);

  // --- File system ---
  ipcMain.handle('browse-folder', async () => {
    const win = mainWindowGetter();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Select Source Folder',
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('browse-dest', async () => {
    const win = mainWindowGetter();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Select Destination Folder',
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('get-drives', async () => {
    const drives: { letter: string; path: string; label: string }[] = [];
    if (process.platform === 'win32') {
      for (let i = 65; i <= 90; i++) {
        const letter = String.fromCharCode(i);
        const drivePath = `${letter}:\\`;
        try {
          fs.accessSync(drivePath);
          drives.push({ letter, path: drivePath, label: `${letter}:` });
        } catch { /* Drive not available */ }
      }
    } else {
      drives.push({ letter: '/', path: '/', label: 'Root' });
      drives.push({ letter: 'H', path: os.homedir(), label: 'Home' });
      if (process.platform === 'darwin') {
        try {
          const volumes = fs.readdirSync('/Volumes');
          for (const vol of volumes) {
            drives.push({ letter: vol[0], path: `/Volumes/${vol}`, label: vol });
          }
        } catch { /* Ignore */ }
      }
    }
    return drives;
  });

  ipcMain.handle('get-folder-children', async (_event, folderPath: string) => {
    try {
      const entries = fs.readdirSync(folderPath, { withFileTypes: true });
      return entries
        .filter((e) => e.isDirectory())
        .map((e) => ({ name: e.name, path: path.join(folderPath, e.name), hasChildren: true }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch { return []; }
  });

  ipcMain.handle('get-folder-files', async (_event, folderPath: string) => {
    try {
      const entries = fs.readdirSync(folderPath, { withFileTypes: true });
      return entries
        .filter((e) => e.isFile())
        .map((e) => ({ name: e.name, path: path.join(folderPath, e.name), size: fs.statSync(path.join(folderPath, e.name)).size }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch { return []; }
  });

  ipcMain.handle('open-folder', async (_event, folderPath: string) => {
    try {
      if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
      const { shell } = require('electron');
      await shell.openPath(folderPath);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('get-file-info', async (_event, filePath: string) => {
    const stat = fs.statSync(filePath);
    return {
      name: path.basename(filePath),
      type: stat.isDirectory() ? 'Folder' : (path.extname(filePath).toLowerCase() || 'File'),
      dir: path.dirname(filePath),
      size: stat.isDirectory() ? null : stat.size,
      created: stat.birthtime.toISOString(),
      modified: stat.mtime.toISOString(),
      accessed: stat.atime.toISOString(),
    };
  });

  // --- Database ---
  ipcMain.handle('db-get-files', async (_event, limit: number, offset: number) => {
    return db.getFiles(limit, offset);
  });

  ipcMain.handle('db-get-file-count', async () => db.getFileCount());

  ipcMain.handle('db-get-runs', async (_event, limit: number) => db.getRuns(limit));

  ipcMain.handle('db-get-stats', async () => db.getStats());

  // --- Scanner ---
  ipcMain.handle('start-scan', async (event, config: ScanConfig) => {
    const progressCallback = (progress: any) => {
      event.sender.send('scan-progress', progress);
    };
    const result = await scanner.scan(config, progressCallback);
    event.sender.send('scan-complete', result);
    return result;
  });

  ipcMain.handle('stop-scan', async () => scanner.stop());

  // --- Organization ---
  ipcMain.handle('generate-plan', async (_event, config: ScanConfig) => {
    return organizer.generatePlan(config);
  });

  ipcMain.handle('execute-plan', async (_event, plans: any[], execute: boolean) => {
    return organizer.executePlan(plans, execute);
  });

  ipcMain.handle('get-no-date-files', async () => {
    const db2 = db.getDb();
    return db2.prepare(`
      SELECT path, filename, media_type FROM files
      WHERE date_extracted IS NULL AND is_organized = 0
      ORDER BY filename
    `).all();
  });

  // --- State persistence ---
  const statePath = path.join(os.homedir(), '.fmc', 'state.json');

  ipcMain.handle('save-state', async (_event, state: any) => {
    try {
      const dir = path.dirname(statePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
      return true;
    } catch { return false; }
  });

  ipcMain.handle('load-state', async () => {
    try {
      if (!fs.existsSync(statePath)) return null;
      return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    } catch { return null; }
  });
}
