import React, { useState } from 'react';
import './JobsPanel.css';

export const JobsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scan' | 'log' | 'history'>('scan');

  return (
    <div className="panel jobs-panel">
      <div className="panel-header">
        <div className="jobs-tabs">
          <button
            className={`jobs-tab ${activeTab === 'scan' ? 'active' : ''}`}
            onClick={() => setActiveTab('scan')}
          >
            Scan
          </button>
          <button
            className={`jobs-tab ${activeTab === 'log' ? 'active' : ''}`}
            onClick={() => setActiveTab('log')}
          >
            Log
          </button>
          <button
            className={`jobs-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
        </div>
      </div>
      <div className="panel-body jobs-body">
        {activeTab === 'scan' && <ScanTab />}
        {activeTab === 'log' && <LogTab />}
        {activeTab === 'history' && <HistoryTab />}
      </div>
    </div>
  );
};

const ScanTab: React.FC = () => {
  return (
    <div className="scan-tab">
      <div className="scan-config">
        <div className="scan-config-section">
          <div className="scan-config-label">Source</div>
          <div className="scan-config-row">
            <input className="input" placeholder="Select source folder..." readOnly />
            <button className="btn btn-sm">Browse</button>
          </div>
        </div>
        <div className="scan-config-section">
          <div className="scan-config-label">Destination</div>
          <div className="scan-config-row">
            <input className="input" placeholder="Select destination folder..." readOnly />
            <button className="btn btn-sm">Browse</button>
          </div>
        </div>
        <div className="scan-config-section">
          <div className="scan-config-row">
            <label className="scan-checkbox">
              <input type="checkbox" defaultChecked />
              <span>Recurse subfolders</span>
            </label>
            <label className="scan-checkbox">
              <input type="checkbox" />
              <span>Execute (real run)</span>
            </label>
          </div>
        </div>
        <div className="scan-config-section">
          <div className="scan-config-row">
            <button className="btn btn-primary">Start Scan</button>
            <button className="btn">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LogTab: React.FC = () => {
  return (
    <div className="log-tab">
      <div className="log-output text-mono">
        <div className="log-line text-3">[System] Family Media Curator v0.0.1 ready</div>
        <div className="log-line text-3">[System] Database initialized</div>
        <div className="log-line text-3">[System] Waiting for scan...</div>
      </div>
    </div>
  );
};

const HistoryTab: React.FC = () => {
  return (
    <div className="history-tab">
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <div className="empty-state-text">No scan history yet</div>
      </div>
    </div>
  );
};
