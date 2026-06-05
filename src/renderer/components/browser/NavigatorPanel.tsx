import React, { useState, useEffect, useCallback } from 'react';
import './NavigatorPanel.css';

interface Drive {
  letter: string;
  path: string;
  label: string;
}

interface FolderEntry {
  name: string;
  path: string;
  hasChildren: boolean;
}

export const NavigatorPanel: React.FC = () => {
  const [drives, setDrives] = useState<Drive[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [folderChildren, setFolderChildren] = useState<Record<string, FolderEntry[]>>({});
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  useEffect(() => {
    loadDrives();
  }, []);

  const loadDrives = async () => {
    const result = await window.fmc.getDrives();
    setDrives(result || []);
  };

  const toggleFolder = useCallback(async (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
      // Load children if not already loaded
      if (!folderChildren[folderPath]) {
        const children = await window.fmc.getFolderChildren(folderPath);
        setFolderChildren((prev) => ({ ...prev, [folderPath]: children }));
      }
    }
    setExpandedFolders(newExpanded);
  }, [expandedFolders, folderChildren]);

  const selectPath = (path: string) => {
    setSelectedPath(path);
  };

  return (
    <div className="panel navigator-panel">
      <div className="panel-header">
        <span className="panel-title">Navigator</span>
      </div>
      <div className="panel-body navigator-body">
        {drives.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📁</div>
            <div className="empty-state-text">Loading drives...</div>
          </div>
        ) : (
          <div className="nav-tree">
            {drives.map((drive) => (
              <DriveNode
                key={drive.path}
                drive={drive}
                expandedFolders={expandedFolders}
                folderChildren={folderChildren}
                selectedPath={selectedPath}
                onToggle={toggleFolder}
                onSelect={selectPath}
                onExpand={async (path) => {
                  const children = await window.fmc.getFolderChildren(path);
                  setFolderChildren((prev) => ({ ...prev, [path]: children }));
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface DriveNodeProps {
  drive: Drive;
  expandedFolders: Set<string>;
  folderChildren: Record<string, FolderEntry[]>;
  selectedPath: string | null;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  onExpand: (path: string) => Promise<void>;
}

const DriveNode: React.FC<DriveNodeProps> = ({
  drive,
  expandedFolders,
  folderChildren,
  selectedPath,
  onToggle,
  onSelect,
  onExpand,
}) => {
  const isExpanded = expandedFolders.has(drive.path);
  const children = folderChildren[drive.path];
  const isSelected = selectedPath === drive.path;

  const handleClick = async () => {
    onSelect(drive.path);
    if (!isExpanded) {
      await onExpand(drive.path);
    }
    onToggle(drive.path);
  };

  return (
    <div className="nav-node">
      <div
        className={`nav-node-row ${isSelected ? 'selected' : ''}`}
        onClick={handleClick}
      >
        <span className="nav-node-arrow">{isExpanded ? '▼' : '▶'}</span>
        <span className="nav-node-icon">💾</span>
        <span className="nav-node-label">{drive.label || `${drive.letter}:`}</span>
      </div>
      {isExpanded && children && (
        <div className="nav-node-children">
          {children.map((child) => (
            <FolderNode
              key={child.path}
              entry={child}
              expandedFolders={expandedFolders}
              folderChildren={folderChildren}
              selectedPath={selectedPath}
              onToggle={onToggle}
              onSelect={onSelect}
              onExpand={onExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface FolderNodeProps {
  entry: FolderEntry;
  expandedFolders: Set<string>;
  folderChildren: Record<string, FolderEntry[]>;
  selectedPath: string | null;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  onExpand: (path: string) => Promise<void>;
}

const FolderNode: React.FC<FolderNodeProps> = ({
  entry,
  expandedFolders,
  folderChildren,
  selectedPath,
  onToggle,
  onSelect,
  onExpand,
}) => {
  const isExpanded = expandedFolders.has(entry.path);
  const children = folderChildren[entry.path];
  const isSelected = selectedPath === entry.path;

  const handleClick = async () => {
    onSelect(entry.path);
    if (!isExpanded) {
      await onExpand(entry.path);
    }
    onToggle(entry.path);
  };

  return (
    <div className="nav-node">
      <div
        className={`nav-node-row ${isSelected ? 'selected' : ''}`}
        onClick={handleClick}
      >
        <span className="nav-node-arrow">{isExpanded ? '▼' : '▶'}</span>
        <span className="nav-node-icon">📁</span>
        <span className="nav-node-label">{entry.name}</span>
      </div>
      {isExpanded && children && (
        <div className="nav-node-children">
          {children.map((child) => (
            <FolderNode
              key={child.path}
              entry={child}
              expandedFolders={expandedFolders}
              folderChildren={folderChildren}
              selectedPath={selectedPath}
              onToggle={onToggle}
              onSelect={onSelect}
              onExpand={onExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};
