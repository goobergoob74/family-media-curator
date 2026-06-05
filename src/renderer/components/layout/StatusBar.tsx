import React from 'react';
import './StatusBar.css';

interface StatusBarProps {
  stats: {
    total: number;
    photos: number;
    videos: number;
    organized: number;
    duplicates: number;
  };
}

export const StatusBar: React.FC<StatusBarProps> = ({ stats }) => {
  return (
    <div className="statusbar">
      <div className="statusbar-left">
        <span className="statusbar-item">
          <span className="statusbar-label">Files:</span>
          <span className="statusbar-value">{stats.total.toLocaleString()}</span>
        </span>
        <span className="statusbar-sep" />
        <span className="statusbar-item">
          <span className="statusbar-label">Photos:</span>
          <span className="statusbar-value text-teal">{stats.photos.toLocaleString()}</span>
        </span>
        <span className="statusbar-sep" />
        <span className="statusbar-item">
          <span className="statusbar-label">Videos:</span>
          <span className="statusbar-value text-amber">{stats.videos.toLocaleString()}</span>
        </span>
        <span className="statusbar-sep" />
        <span className="statusbar-item">
          <span className="statusbar-label">Organized:</span>
          <span className="statusbar-value text-green">{stats.organized.toLocaleString()}</span>
        </span>
        {stats.duplicates > 0 && (
          <>
            <span className="statusbar-sep" />
            <span className="statusbar-item">
              <span className="statusbar-label">Duplicates:</span>
              <span className="statusbar-value text-red">{stats.duplicates.toLocaleString()}</span>
            </span>
          </>
        )}
      </div>
      <div className="statusbar-right">
        <span className="statusbar-item text-2">Ready</span>
      </div>
    </div>
  );
};
