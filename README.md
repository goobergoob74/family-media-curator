# Family Media Curator

A cross-platform desktop app (macOS + Windows) that automatically organizes, renames, deduplicates, and enriches your entire family photo and video archive.

## Features

- **File Organization**: Sort photos and videos into structured year/month folders
- **Smart Renaming**: Rename files based on EXIF/metadata dates with full fallback chain
- **Duplicate Detection**: Hash-based exact matching and perceptual similarity
- **Metadata Tools**: Read and edit EXIF, IPTC, XMP metadata (ExifScope)
- **Face Recognition**: Local face detection and person tagging
- **Interactive Map**: GPS-tagged media plotted on a world map
- **iCloud Photos**: Import from Apple Photos library (macOS) or iCloud for Windows

## Tech Stack

- **Shell**: Electron 28+
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js (main process)
- **Database**: SQLite (better-sqlite3)
- **Image Processing**: sharp
- **Metadata**: exifr (fast read), exiftool-vendored (full read/write)
- **State**: Zustand

## Development

```bash
# Install dependencies
npm install

# Rebuild native modules for Electron
npx electron-rebuild -f -w better-sqlite3

# Build
npm run build

# Launch
npm start

# Dev mode (hot reload)
npm run dev
```

## Project Structure

```
src/
├── main/           # Electron main process
│   ├── ipc/        # IPC handlers
│   └── services/   # Database, scanner services
├── renderer/       # React UI
│   ├── components/ # UI components
│   ├── store/      # Zustand state
│   ├── styles/     # CSS
│   └── types/      # TypeScript declarations
└── shared/         # Shared code (date engine, types)
```

## Version

v0.0.1 — Foundation scaffold
