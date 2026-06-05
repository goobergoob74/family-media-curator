# Family Media Curator — Changelog

## v0.0.1 — 2026-06-05 · Foundation
### New Features
- **Project scaffold**: Electron + React + TypeScript project structure
- **Main process**: Electron main process with window management, IPC routing, file system operations
- **Preload bridge**: Secure contextBridge IPC API (window.fmc) with 25+ methods
- **Database service**: SQLite (better-sqlite3) with full schema — files, metadata, faces, persons, runs, thumbnails
- **File scanner service**: Recursive directory scanning with media file detection (30+ extensions)
- **exifr integration**: Fast EXIF extraction for photos (JPEG, PNG, HEIC, RAW, etc.)
- **Date extraction engine**: Full fallback chain (EXIF → filesystem → filename) ported from MediaTidy v1.2.4
- **Date parser**: EXIF date format parsing with timezone handling, filename date pattern matching
- **Organization service**: File move/copy/rename with plan generation and execution
- **Folder structure builder**: YYYY_MediaType/YYYY_MM_MediaType/YYYY-MM-DD HH.mm.ss.ext
- **Suffix preservation**: Smart mode (strips generic camera prefixes like IMG_, DSC_)
- **Collision handling**: Unique path generation with (1), (2) suffixes
- **React UI**: Three-panel layout (Navigator, Preview, Jobs) with industrial design system
- **Title bar**: Custom frameless title bar with window controls
- **Menu bar**: File/Tools/View menus, Dry Run/Execute mode toggle
- **Status bar**: Real-time stats display (total, photos, videos, organized, duplicates)
- **Navigator panel**: Drive listing, expandable folder tree with lazy loading
- **Preview panel**: Placeholder for file preview
- **Jobs panel**: Scan config (wired to scanner), activity log, and history tabs
- **Scan progress**: Real-time progress bar, file counts, elapsed time
- **State management**: Zustand store for app state
- **Type declarations**: Full TypeScript types for Electron bridge API

### Architecture Decisions
- Electron 28+ for cross-platform desktop shell
- React 18 + TypeScript for renderer
- better-sqlite3 (v11.7.0) for database (WAL mode, composite tsconfig)
- Separate tsconfig for shared, main, and renderer modules
- Industrial design system (near-black #080a0d, amber #f0a500 accent)
- DM Mono + Barlow Condensed font pairing
- exifr for fast photo metadata extraction (30x faster than ExifTool for read)
- Date engine accepts both ISO strings (exiftool) and Date objects (exifr)

### Known Issues
- better-sqlite3 requires electron-rebuild for native module compatibility
- Renderer path resolution requires `../../renderer/` from compiled main process
- Preview panel is placeholder — needs real preview implementation
- No thumbnail generation yet
- No face recognition yet
- No map view yet
- No iCloud integration yet
