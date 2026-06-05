# Family Media Curator — Changelog

## v0.0.1 — 2026-06-05 · Foundation
### New Features
- **Project scaffold**: Electron + React + TypeScript project structure
- **Main process**: Electron main process with window management, IPC routing, file system operations
- **Preload bridge**: Secure contextBridge IPC API (window.fmc) with 20+ methods
- **Database service**: SQLite (better-sqlite3) with full schema — files, metadata, faces, persons, runs, thumbnails
- **File scanner service**: Recursive directory scanning with media file detection (30+ extensions)
- **Date extraction engine**: Full fallback chain (EXIF → filesystem → filename) ported from MediaTidy v1.2.4
- **Date parser**: EXIF date format parsing with timezone handling, filename date pattern matching
- **React UI**: Three-panel layout (Navigator, Preview, Jobs) with industrial design system
- **Title bar**: Custom frameless title bar with window controls
- **Menu bar**: File/Tools/View menus, Dry Run/Execute mode toggle
- **Status bar**: Real-time stats display (total, photos, videos, organized, duplicates)
- **Navigator panel**: Drive listing, expandable folder tree with lazy loading
- **Preview panel**: Placeholder for file preview
- **Jobs panel**: Scan config, activity log, and history tabs
- **State management**: Zustand store for app state
- **Type declarations**: Full TypeScript types for Electron bridge API

### Architecture Decisions
- Electron 28+ for cross-platform desktop shell
- React 18 + TypeScript for renderer
- better-sqlite3 (v11.7.0) for database (WAL mode, composite tsconfig)
- Separate tsconfig for shared, main, and renderer modules
- Industrial design system (near-black #080a0d, amber #f0a500 accent)
- DM Mono + Barlow Condensed font pairing

### Known Issues
- better-sqlite3 requires electron-rebuild for native module compatibility
- Renderer path resolution requires `../../renderer/` from compiled main process
