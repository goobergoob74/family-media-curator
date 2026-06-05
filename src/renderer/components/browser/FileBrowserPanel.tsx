import React, { useState, useEffect } from 'react';
import './FileBrowserPanel.css';

interface FileEntry {
  name: string;
  path: string;
  size: number;
  extension: string;
}

interface FileBrowserPanelProps {
  folderPath: string | null;
  onFileSelect: (filePath: string) => void;
}

export const FileBrowserPanel: React.FC<FileBrowserPanelProps> = ({ folderPath, onFileSelect }) => {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    if (folderPath) {
      loadFiles(folderPath);
    } else {
      setFiles([]);
    }
  }, [folderPath]);

  const loadFiles = async (path: string) => {
    setLoading(true);
    try {
      const result = await window.fmc.getFolderFiles(path);
      setFiles(result || []);
    } catch {
      setFiles([]);
    }
    setLoading(false);
  };

  const sortedFiles = [...files].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
    else if (sortBy === 'size') cmp = a.size - b.size;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getFileIcon = (ext: string) => {
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.raw', '.cr2', '.nef', '.arw', '.dng', '.avif'];
    const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.m4v', '.webm', '.flv'];
    if (imageExts.includes(ext.toLowerCase())) return '🖼️';
    if (videoExts.includes(ext.toLowerCase())) return '🎬';
    return '📄';
  };

  if (!folderPath) {
    return (
      <div className="file-browser-empty">
        <div className="empty-state">
          <div className="empty-state-icon">📂</div>
          <div className="empty-state-text">Select a folder to browse files</div>
        </div>
      </div>
    );
  }

  return (
    <div className="file-browser">
      <div className="file-browser-toolbar">
        <div className="file-browser-path text-mono text-2" title={folderPath}>
          {folderPath}
        </div>
        <div className="file-browser-controls">
          <span className="file-browser-count text-2">{files.length} files</span>
          <div className="file-browser-sort">
            <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
              <option value="name">Name</option>
              <option value="size">Size</option>
            </select>
            <button className="btn-icon" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
              {sortDir === 'asc' ? '↑' : '↓'}
            </button>
          </div>
          <div className="file-browser-view-toggle">
            <button className={`btn-icon ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>☰</button>
            <button className={`btn-icon ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>⊞</button>
          </div>
        </div>
      </div>

      <div className={`file-browser-body ${viewMode}`}>
        {loading ? (
          <div className="file-browser-loading">Loading...</div>
        ) : sortedFiles.length === 0 ? (
          <div className="file-browser-empty">
            <div className="empty-state">
              <div className="empty-state-text">No files in this folder</div>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          <div className="file-list">
            <div className="file-list-header">
              <span className="file-col-icon" />
              <span className="file-col-name">Name</span>
              <span className="file-col-size">Size</span>
              <span className="file-col-ext">Type</span>
            </div>
            {sortedFiles.map((file) => (
              <div
                key={file.path}
                className="file-list-row"
                onClick={() => onFileSelect(file.path)}
                title={file.path}
              >
                <span className="file-col-icon">{getFileIcon(file.extension)}</span>
                <span className="file-col-name text-mono">{file.name}</span>
                <span className="file-col-size text-2">{formatSize(file.size)}</span>
                <span className="file-col-ext badge badge-amber">{file.extension || '—'}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="file-grid">
            {sortedFiles.map((file) => (
              <div
                key={file.path}
                className="file-grid-item"
                onClick={() => onFileSelect(file.path)}
                title={file.name}
              >
                <div className="file-grid-icon">{getFileIcon(file.extension)}</div>
                <div className="file-grid-name text-mono">{file.name}</div>
                <div className="file-grid-size text-3">{formatSize(file.size)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
