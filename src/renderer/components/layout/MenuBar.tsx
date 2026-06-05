import React, { useState } from 'react';
import './MenuBar.css';

export const MenuBar: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  return (
    <div className="menubar">
      <div className="menubar-left">
        <div className="menu-item">
          <button
            className={`menu-btn ${activeMenu === 'file' ? 'open' : ''}`}
            onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
          >
            File
          </button>
        </div>
        <div className="menu-item">
          <button
            className={`menu-btn ${activeMenu === 'tools' ? 'open' : ''}`}
            onClick={() => setActiveMenu(activeMenu === 'tools' ? null : 'tools')}
          >
            Tools
          </button>
        </div>
        <div className="menu-item">
          <button
            className={`menu-btn ${activeMenu === 'view' ? 'open' : ''}`}
            onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
          >
            View
          </button>
        </div>
      </div>

      <div className="menubar-center">
        <div className="mode-toggle">
          <button className="mode-btn active">Dry Run</button>
          <button className="mode-btn">Execute</button>
        </div>
      </div>

      <div className="menubar-right">
        <button className="menubar-icon-btn" title="Settings">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M7 1v2M7 11v2M1 7h2M11 7h2M2.8 2.8l1.4 1.4M9.8 9.8l1.4 1.4M2.8 11.2l1.4-1.4M9.8 4.2l1.4-1.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
};
