import React from 'react';
import { useAppStore } from '../../store/appStore';
import './JobsPanel.css';

export const JobsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'scan' | 'log' | 'history'>('scan');

  return (
    <div className="panel jobs-panel">
      <div className="panel-header">
        <div className="jobs-tabs">
          <button className={`jobs-tab ${activeTab === 'scan' ? 'active' : ''}`} onClick={() => setActiveTab('scan')}>
            Scan
          </button>
          <button className={`jobs-tab ${activeTab === 'log' ? 'active' : ''}`} onClick={() => setActiveTab('log')}>
            Log {logCount > 0 && <span className="badge badge-amber">{logCount}</span>}
          </button>
          <button className={`jobs-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
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

const logCount = 0; // Will be connected to store

const ScanTab: React.FC = () => {
  const { scanConfig, scanProgress, isScanning, setScanConfig, startScan, stopScan, addLogLine } = useAppStore();

  const browseSource = async () => {
    const path = await window.fmc.browseFolder();
    if (path) {
      setScanConfig({ rootPath: path });
      addLogLine('info', `Source: ${path}`);
    }
  };

  const browseDest = async () => {
    const path = await window.fmc.browseDest();
    if (path) {
      setScanConfig({ destPath: path });
      addLogLine('info', `Destination: ${path}`);
    }
  };

  const progressPercent = scanProgress && scanProgress.filesTotal > 0
    ? Math.round((scanProgress.filesScanned / scanProgress.filesTotal) * 100)
    : 0;

  return (
    <div className="scan-tab">
      {/* Source/Dest */}
      <div className="scan-config">
        <div className="scan-config-section">
          <div className="scan-config-label">Source Folder</div>
          <div className="scan-config-row">
            <input
              className="input"
              placeholder="Select source folder..."
              value={scanConfig.rootPath}
              readOnly
            />
            <button className="btn btn-sm" onClick={browseSource}>Browse</button>
          </div>
        </div>

        <div className="scan-config-section">
          <div className="scan-config-label">Destination Folder</div>
          <div className="scan-config-row">
            <input
              className="input"
              placeholder="Select destination folder..."
              value={scanConfig.destPath}
              readOnly
            />
            <button className="btn btn-sm" onClick={browseDest}>Browse</button>
          </div>
        </div>

        {/* Mode */}
        <div className="scan-config-section">
          <div className="scan-config-label">Mode</div>
          <select
            className="select"
            value={scanConfig.mode}
            onChange={(e) => setScanConfig({ mode: e.target.value as any })}
          >
            <option value="tidy">Tidy (Move + Rename)</option>
            <option value="sort">Sort (Move Only)</option>
            <option value="rename">Rename (In Place)</option>
          </select>
        </div>

        {/* Options */}
        <div className="scan-config-section">
          <div className="scan-config-row">
            <label className="scan-checkbox">
              <input
                type="checkbox"
                checked={scanConfig.recurse}
                onChange={(e) => setScanConfig({ recurse: e.target.checked })}
              />
              <span>Recurse subfolders</span>
            </label>
            <label className="scan-checkbox">
              <input
                type="checkbox"
                checked={scanConfig.execute}
                onChange={(e) => setScanConfig({ execute: e.target.checked })}
              />
              <span>Execute (real run)</span>
            </label>
          </div>
        </div>

        {/* Batch limit */}
        <div className="scan-config-section">
          <div className="scan-config-label">Batch Limit</div>
          <div className="scan-config-row">
            <input
              className="input"
              type="number"
              value={scanConfig.maxFiles}
              onChange={(e) => setScanConfig({ maxFiles: parseInt(e.target.value) || 0 })}
              min={0}
              step={100}
            />
            <span className="text-2" style={{ fontSize: 11 }}>0 = unlimited</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="scan-config-section">
          <div className="scan-config-row">
            {!isScanning ? (
              <button className="btn btn-primary" onClick={startScan}>
                {scanConfig.execute ? '▶ Execute' : '▶ Dry Run'}
              </button>
            ) : (
              <button className="btn btn-danger" onClick={stopScan}>
                ■ Stop
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress */}
      {scanProgress && (
        <div className="scan-progress">
          <div className="scan-progress-header">
            <span className="scan-progress-phase text-mono">{scanProgress.phase}</span>
            <span className="scan-progress-count text-2">
              {scanProgress.filesScanned}/{scanProgress.filesTotal}
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          {scanProgress.currentFile && (
            <div className="scan-progress-file text-mono text-3">
              {scanProgress.currentFile}
            </div>
          )}
          <div className="scan-progress-stats text-2" style={{ marginTop: 4 }}>
            Processed: {scanProgress.filesProcessed} | Skipped: {scanProgress.filesSkipped} | Dups: {scanProgress.duplicatesFound} | {scanProgress.elapsedSeconds}s
          </div>
        </div>
      )}
    </div>
  );
};

const LogTab: React.FC = () => {
  const { logLines, clearLog } = useAppStore();

  const typeColors: Record<string, string> = {
    info: 'text-1',
    warn: 'text-amber',
    error: 'text-red',
    success: 'text-green',
  };

  return (
    <div className="log-tab">
      <div className="log-header">
        <button className="btn btn-sm" onClick={clearLog}>Clear</button>
      </div>
      <div className="log-output text-mono">
        {logLines.length === 0 ? (
          <div className="log-line text-3">[System] Family Media Curator v0.0.1 ready</div>
        ) : (
          logLines.map((line, i) => (
            <div key={i} className={`log-line ${typeColors[line.type] || 'text-1'}`}>
              <span className="text-3">[{line.timestamp}]</span> {line.text}
            </div>
          ))
        )}
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
        <div className="empty-state-hint text-3">Run a scan to see history here</div>
      </div>
    </div>
  );
};
