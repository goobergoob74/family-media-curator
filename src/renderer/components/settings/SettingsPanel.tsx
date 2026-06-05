import React from 'react';
import './SettingsPanel.css';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <span className="settings-title">Settings</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="settings-tabs">
          <button className="settings-tab active">General</button>
          <button className="settings-tab">Organization</button>
          <button className="settings-tab">Duplicates</button>
          <button className="settings-tab">ExifScope</button>
          <button className="settings-tab">Performance</button>
        </div>

        <div className="settings-body">
          {/* General */}
          <div className="settings-section">
            <div className="settings-section-title">Appearance</div>
            <div className="settings-row">
              <label className="settings-label">Theme</label>
              <select className="select">
                <option>Industrial (Default)</option>
                <option>File Explorer</option>
                <option>Light</option>
              </select>
            </div>
          </div>

          {/* Organization */}
          <div className="settings-section">
            <div className="settings-section-title">Organization</div>
            <div className="settings-row">
              <label className="settings-label">Default Mode</label>
              <select className="select">
                <option>Tidy (Move + Rename)</option>
                <option>Sort (Move Only)</option>
                <option>Rename (In Place)</option>
              </select>
            </div>
            <div className="settings-row">
              <label className="settings-label">Min Year</label>
              <input className="input" type="number" defaultValue={1990} min={1900} max={2030} />
            </div>
            <div className="settings-row">
              <label className="settings-label">Suffix Mode</label>
              <select className="select">
                <option value="smart">Smart (filter generic)</option>
                <option value="all">Keep all</option>
                <option value="none">None</option>
              </select>
            </div>
            <div className="settings-row">
              <label className="settings-label">No-Date Action</label>
              <select className="select">
                <option>Move to "unnamed" folder</option>
                <option>Skip with alert</option>
                <option>Skip silently</option>
              </select>
            </div>
          </div>

          {/* Duplicates */}
          <div className="settings-section">
            <div className="settings-section-title">Duplicate Detection</div>
            <div className="settings-row">
              <label className="settings-label">Algorithm</label>
              <select className="select">
                <option>SHA-256 (exact match)</option>
                <option>pHash (perceptual)</option>
              </select>
            </div>
            <div className="settings-row">
              <label className="settings-label">Default Policy</label>
              <select className="select">
                <option>Ranked (best quality wins)</option>
                <option>Move to DupsFolder</option>
                <option>Keep Newest</option>
                <option>Keep Largest</option>
              </select>
            </div>
          </div>

          {/* ExifScope */}
          <div className="settings-section">
            <div className="settings-section-title">ExifScope</div>
            <div className="settings-row">
              <label className="settings-checkbox">
                <input type="checkbox" />
                <span>Enable metadata write mode</span>
              </label>
            </div>
            <div className="settings-row">
              <label className="settings-checkbox">
                <input type="checkbox" defaultChecked />
                <span>Backup metadata before writes</span>
              </label>
            </div>
            <div className="settings-row">
              <label className="settings-checkbox">
                <input type="checkbox" defaultChecked />
                <span>Verify after write</span>
              </label>
            </div>
          </div>

          {/* Performance */}
          <div className="settings-section">
            <div className="settings-section-title">Performance</div>
            <div className="settings-row">
              <label className="settings-label">Default Batch Limit</label>
              <input className="input" type="number" defaultValue={500} min={0} step={100} />
            </div>
            <div className="settings-row">
              <label className="settings-label">Concurrent Jobs</label>
              <input className="input" type="number" defaultValue={4} min={1} max={16} />
            </div>
            <div className="settings-row">
              <label className="settings-label">Thumbnail Cache (MB)</label>
              <input className="input" type="number" defaultValue={500} min={100} max={5000} step={100} />
            </div>
            <div className="settings-row">
              <label className="settings-checkbox">
                <input type="checkbox" />
                <span>Unlock unlimited batch size</span>
              </label>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary">Save</button>
        </div>
      </div>
    </div>
  );
};
