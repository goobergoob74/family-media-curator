import React from 'react';
import './PreviewPanel.css';

export const PreviewPanel: React.FC = () => {
  return (
    <div className="panel preview-panel">
      <div className="panel-header">
        <span className="panel-title">Preview</span>
      </div>
      <div className="panel-body preview-body">
        <div className="empty-state">
          <div className="empty-state-icon">🖼️</div>
          <div className="empty-state-text">Select a file to preview</div>
          <div className="empty-state-hint text-3">
            Browse folders in the Navigator to get started
          </div>
        </div>
      </div>
    </div>
  );
};
