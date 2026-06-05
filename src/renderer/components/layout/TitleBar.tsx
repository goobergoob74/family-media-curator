import React from 'react';
import './TitleBar.css';

interface TitleBarProps {
  version: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({ version }) => {
  return (
    <div className="titlebar">
      <div className="titlebar-logo">
        <div className="titlebar-logo-icon" />
        <span className="titlebar-logo-name">Family Media Curator</span>
        <span className="titlebar-logo-version">v{version}</span>
      </div>
      <div className="titlebar-drag" />
      <div className="titlebar-controls">
        <button className="titlebar-btn" onClick={() => window.fmc.minimize()}>
          <svg width="10" height="1" viewBox="0 0 10 1"><line x1="0" y1="0.5" x2="10" y2="0.5" stroke="currentColor" strokeWidth="1"/></svg>
        </button>
        <button className="titlebar-btn" onClick={() => window.fmc.maximize()}>
          <svg width="10" height="10" viewBox="0 0 10 10"><rect x="0" y="0" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1"/></svg>
        </button>
        <button className="titlebar-btn titlebar-btn-close" onClick={() => window.fmc.close()}>
          <svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.2"/></svg>
        </button>
      </div>
    </div>
  );
};
