# Family Media Curator — Development Context
# Location: /Users/goob/app_creation/agents/viddie/family-media-curator/CONTEXT.md
# UPDATE THIS FILE at the end of every session.

---

## Current Version
**v0.0.1** — Foundation scaffold complete

## Active Branch of Work
Milestone 0: Foundation — COMPLETE
Next: Milestone 1 — Core Organization Engine (date extraction integration, metadata scanning, file organization logic)

---

## App Architecture

### Three-Panel Layout
```
[ Navigator ] | [ Preview ] | [ Jobs/Log ]
```
- **Navigator** (`NavigatorPanel`): Drive tree, folder browser with lazy loading
- **Preview** (`PreviewPanel`): File preview, metadata display (placeholder in v0.0.1)
- **Jobs** (`JobsPanel`): Scan config, activity log, run history

### IPC Bridge
- `main.ts` runs in Node.js — handles file system, database, scanning
- `preload.ts` exposes `window.fmc` to the renderer via `contextBridge`
- React components in `src/renderer/` communicate via `window.fmc.*` methods

### State Management
- Zustand store (`src/renderer/store/appStore.ts`) for UI state
- SQLite (`better-sqlite3`) for persistent data catalog
- JSON state file (`~/.fmc/state.json`) for app preferences

### Database Schema
- `files` — file catalog with path, hash, metadata, organization status
- `metadata` — key-value metadata cache per file
- `faces` — face detection data with descriptors
- `persons` — named people for face recognition
- `runs` — scan/job history
- `thumbnails` — thumbnail cache index

### TypeScript Configs
- `tsconfig.main.json` — compiles `src/main/` + `src/shared/` → `dist/main/`
- `tsconfig.renderer.json` — type-checks `src/renderer/` (Vite handles build)
- `tsconfig.shared.json` — standalone shared module compilation (backup)

---

## Key File Locations
| File | Path |
|------|------|
| Main process | `src/main/main.ts` |
| Preload bridge | `src/main/preload.ts` |
| IPC handlers | `src/main/ipc/handlers.ts` |
| Database service | `src/main/services/DatabaseService.ts` |
| File scanner | `src/main/services/FileScannerService.ts` |
| Date extractor | `src/shared/date-engine/DateExtractor.ts` |
| Date parser | `src/shared/date-engine/DateParser.ts` |
| Shared types | `src/shared/types/index.ts` |
| App component | `src/renderer/App.tsx` |
| App store | `src/renderer/store/appStore.ts` |
| Electron types | `src/renderer/types/electron.d.ts` |
| Global styles | `src/renderer/styles/global.css` |
| App styles | `src/renderer/styles/app.css` |

---

## Build Commands
```bash
npm run build          # Build everything (main + renderer)
npm run build:main     # Build main process + shared
npm run build:renderer # Build renderer (Vite)
npm run dev            # Dev mode (concurrent watch)
npm start              # Launch Electron
```

---

## Known Issues (as of v0.0.1)
| Issue | Priority | Notes |
|-------|----------|-------|
| better-sqlite3 native rebuild | MEDIUM | Must run `electron-rebuild` after npm install |
| Preview panel is placeholder | LOW | Needs real preview implementation |
| Scan config is not wired | HIGH | UI exists but doesn't connect to scanner service |
| No metadata extraction yet | HIGH | exifr/sharp not integrated into scanner |
| No thumbnail generation yet | LOW | Architecture designed, not implemented |

---

## Dev Workflow
1. Edit files in `src/`
2. Run `npm run build` to compile
3. Run `npm start` to launch Electron
4. For native module changes: `npx electron-rebuild -f -w better-sqlite3`
