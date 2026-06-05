/**
 * SQLite database service for Family Media Curator
 * Manages the file catalog, metadata cache, face data, and run history.
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT UNIQUE NOT NULL,
  filename TEXT NOT NULL,
  extension TEXT,
  size INTEGER,
  mtime TEXT,
  hash TEXT,
  phash TEXT,
  media_type TEXT CHECK(media_type IN ('photo','video')),
  date_extracted TEXT,
  date_source TEXT,
  is_organized INTEGER DEFAULT 0,
  metadata_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS metadata (
  file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
  tag_group TEXT,
  tag_name TEXT,
  tag_value TEXT,
  PRIMARY KEY (file_id, tag_name)
);

CREATE TABLE IF NOT EXISTS faces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
  descriptor BLOB,
  x INTEGER,
  y INTEGER,
  w INTEGER,
  h INTEGER,
  person_id INTEGER,
  confidence REAL
);

CREATE TABLE IF NOT EXISTS persons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT,
  ended_at TEXT,
  mode TEXT,
  source_path TEXT,
  dest_path TEXT,
  files_found INTEGER DEFAULT 0,
  files_processed INTEGER DEFAULT 0,
  files_skipped INTEGER DEFAULT 0,
  duplicates_found INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  report_path TEXT
);

CREATE TABLE IF NOT EXISTS thumbnails (
  file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
  width INTEGER,
  height INTEGER,
  cache_path TEXT,
  generated_at TEXT,
  PRIMARY KEY (file_id, width, height)
);

CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash);
CREATE INDEX IF NOT EXISTS idx_files_phash ON files(phash);
CREATE INDEX IF NOT EXISTS idx_files_date ON files(date_extracted);
CREATE INDEX IF NOT EXISTS idx_files_media_type ON files(media_type);
CREATE INDEX IF NOT EXISTS idx_files_is_organized ON files(is_organized);
CREATE INDEX IF NOT EXISTS idx_metadata_tag ON metadata(tag_name, tag_value);
CREATE INDEX IF NOT EXISTS idx_faces_person ON faces(person_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
`;

export class DatabaseService {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  initialize(): void {
    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    // Create schema
    this.db.exec(SCHEMA_SQL);
  }

  getDb(): Database.Database {
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // --- File operations ---

  insertFile(file: {
    path: string;
    filename: string;
    extension: string;
    size: number;
    mtime: string;
    hash?: string;
    phash?: string;
    mediaType: 'photo' | 'video';
    dateExtracted?: string;
    dateSource?: string;
    isOrganized?: boolean;
    metadataJson?: string;
  }): number {
    const stmt = this.getDb().prepare(`
      INSERT OR REPLACE INTO files
        (path, filename, extension, size, mtime, hash, phash, media_type,
         date_extracted, date_source, is_organized, metadata_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    const result = stmt.run(
      file.path, file.filename, file.extension, file.size, file.mtime,
      file.hash ?? null, file.phash ?? null, file.mediaType,
      file.dateExtracted ?? null, file.dateSource ?? null,
      file.isOrganized ? 1 : 0, file.metadataJson ?? null
    );
    return result.lastInsertRowid as number;
  }

  getFileByPath(filePath: string): any {
    return this.getDb().prepare('SELECT * FROM files WHERE path = ?').get(filePath);
  }

  getFiles(limit: number, offset: number): any[] {
    return this.getDb()
      .prepare('SELECT * FROM files ORDER BY id DESC LIMIT ? OFFSET ?')
      .all(limit, offset);
  }

  getFileCount(): number {
    const row = this.getDb().prepare('SELECT COUNT(*) as count FROM files').get() as any;
    return row?.count ?? 0;
  }

  getStats(): { total: number; photos: number; videos: number; organized: number; duplicates: number } {
    const db = this.getDb();
    const total = (db.prepare('SELECT COUNT(*) as c FROM files').get() as any)?.c ?? 0;
    const photos = (db.prepare("SELECT COUNT(*) as c FROM files WHERE media_type = 'photo'").get() as any)?.c ?? 0;
    const videos = (db.prepare("SELECT COUNT(*) as c FROM files WHERE media_type = 'video'").get() as any)?.c ?? 0;
    const organized = (db.prepare('SELECT COUNT(*) as c FROM files WHERE is_organized = 1').get() as any)?.c ?? 0;
    const duplicates = (db.prepare('SELECT COUNT(*) as c FROM files WHERE hash IN (SELECT hash FROM files WHERE hash IS NOT NULL GROUP BY hash HAVING COUNT(*) > 1)').get() as any)?.c ?? 0;
    return { total, photos, videos, organized, duplicates };
  }

  // --- Run operations ---

  insertRun(run: {
    startedAt: string;
    mode: string;
    sourcePath: string;
    destPath?: string;
  }): number {
    const stmt = this.getDb().prepare(`
      INSERT INTO runs (started_at, mode, source_path, dest_path, status)
      VALUES (?, ?, ?, ?, 'running')
    `);
    const result = stmt.run(run.startedAt, run.mode, run.sourcePath, run.destPath ?? null);
    return result.lastInsertRowid as number;
  }

  updateRun(id: number, updates: {
    endedAt?: string;
    filesFound?: number;
    filesProcessed?: number;
    filesSkipped?: number;
    duplicatesFound?: number;
    status?: string;
    reportPath?: string;
  }): void {
    const fields: string[] = [];
    const values: any[] = [];
    if (updates.endedAt) { fields.push('ended_at = ?'); values.push(updates.endedAt); }
    if (updates.filesFound !== undefined) { fields.push('files_found = ?'); values.push(updates.filesFound); }
    if (updates.filesProcessed !== undefined) { fields.push('files_processed = ?'); values.push(updates.filesProcessed); }
    if (updates.filesSkipped !== undefined) { fields.push('files_skipped = ?'); values.push(updates.filesSkipped); }
    if (updates.duplicatesFound !== undefined) { fields.push('duplicates_found = ?'); values.push(updates.duplicatesFound); }
    if (updates.status) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.reportPath) { fields.push('report_path = ?'); values.push(updates.reportPath); }
    if (fields.length === 0) return;
    values.push(id);
    this.getDb().prepare(`UPDATE runs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  getRuns(limit: number): any[] {
    return this.getDb()
      .prepare('SELECT * FROM runs ORDER BY id DESC LIMIT ?')
      .all(limit);
  }
}
