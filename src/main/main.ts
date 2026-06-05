/**
 * Family Media Curator — Electron Main Process
 * Version: 0.0.1
 *
 * Handles: window creation, IPC routing, file system operations,
 * database management, and service orchestration.
 */

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import { DatabaseService } from './services/DatabaseService';
import { FileScannerService } from './services/FileScannerService';
import { OrganizationService } from './services/OrganizationService';
import { registerIpcHandlers } from './ipc/handlers';

let mainWindow: BrowserWindow | null = null;
let db: DatabaseService;
let scanner: FileScannerService;
let organizer: OrganizationService;

const isDev = process.argv.includes('--dev');

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    backgroundColor: '#080a0d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Initialize database
  const dbPath = path.join(app.getPath('userData'), 'fmc-catalog.db');
  db = new DatabaseService(dbPath);
  db.initialize();

  // Initialize services
  scanner = new FileScannerService(db);
  organizer = new OrganizationService(db);

  // Register IPC handlers
  registerIpcHandlers({ db, scanner, organizer, mainWindowGetter: () => mainWindow });

  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    db?.close();
    app.quit();
  }
});

app.on('before-quit', () => {
  db?.close();
});
