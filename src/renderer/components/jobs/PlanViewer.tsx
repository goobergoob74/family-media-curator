import React, { useState, useMemo } from 'react';
import './PlanViewer.css';

interface PlanItem {
  id: string;
  sourcePath: string;
  destinationPath: string;
  action: 'move' | 'copy' | 'rename' | 'skip';
  originalDate?: string;
  newDate?: string;
}

interface PlanViewerProps {
  plans: PlanItem[];
  onExecute: (execute: boolean) => void;
  onRefresh: () => void;
}

export const PlanViewer: React.FC<PlanViewerProps> = ({ plans, onExecute, onRefresh }) => {
  const [filter, setFilter] = useState<'all' | 'operations' | 'skipped'>('all');
  const [sortField, setSortField] = useState<'source' | 'dest' | 'action'>('source');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredPlans = useMemo(() => {
    let filtered = plans;
    if (filter === 'operations') filtered = plans.filter(p => p.action !== 'skip');
    if (filter === 'skipped') filtered = filtered = plans.filter(p => p.action === 'skip');

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'source') cmp = a.sourcePath.localeCompare(b.sourcePath);
      else if (sortField === 'dest') cmp = a.destinationPath.localeCompare(b.destinationPath);
      else if (sortField === 'action') cmp = a.action.localeCompare(b.action);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [plans, filter, sortField, sortDir]);

  const stats = useMemo(() => {
    const ops = plans.filter(p => p.action !== 'skip').length;
    const skipped = plans.filter(p => p.action === 'skip').length;
    const moves = plans.filter(p => p.action === 'move').length;
    const copies = plans.filter(p => p.action === 'copy').length;
    const renames = plans.filter(p => p.action === 'rename').length;
    return { total: plans.length, ops, skipped, moves, copies, renames };
  }, [plans]);

  const toggleSort = (field: 'source' | 'dest' | 'action') => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredPlans.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredPlans.map(p => p.id)));
  };

  return (
    <div className="plan-viewer">
      {/* Stats bar */}
      <div className="plan-stats">
        <div className="plan-stat">
          <span className="plan-stat-value">{stats.total}</span>
          <span className="plan-stat-label">Total</span>
        </div>
        <div className="plan-stat">
          <span className="plan-stat-value text-amber">{stats.ops}</span>
          <span className="plan-stat-label">Operations</span>
        </div>
        <div className="plan-stat">
          <span className="plan-stat-value text-green">{stats.moves}</span>
          <span className="plan-stat-label">Moves</span>
        </div>
        <div className="plan-stat">
          <span className="plan-stat-value text-teal">{stats.copies}</span>
          <span className="plan-stat-label">Copies</span>
        </div>
        <div className="plan-stat">
          <span className="plan-stat-value text-blue">{stats.renames}</span>
          <span className="plan-stat-label">Renames</span>
        </div>
        <div className="plan-stat">
          <span className="plan-stat-value text-2">{stats.skipped}</span>
          <span className="plan-stat-label">Skipped</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="plan-toolbar">
        <div className="plan-filters">
          <button className={`plan-filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`plan-filter-btn ${filter === 'operations' ? 'active' : ''}`} onClick={() => setFilter('operations')}>Operations</button>
          <button className={`plan-filter-btn ${filter === 'skipped' ? 'active' : ''}`} onClick={() => setFilter('skipped')}>Skipped</button>
        </div>
        <div className="plan-actions">
          <button className="btn btn-sm" onClick={onRefresh}>Refresh</button>
          <button className="btn btn-sm btn-primary" onClick={() => onExecute(false)}>Dry Run</button>
          <button className="btn btn-sm btn-danger" onClick={() => onExecute(true)}>Execute</button>
        </div>
      </div>

      {/* Table */}
      <div className="plan-table-container">
        <table className="plan-table">
          <thead>
            <tr>
              <th className="plan-th-check">
                <input type="checkbox" checked={selectedIds.size === filteredPlans.length && filteredPlans.length > 0} onChange={selectAll} />
              </th>
              <th className="plan-th-action" onClick={() => toggleSort('action')}>
                Action {sortField === 'action' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th className="plan-th-source" onClick={() => toggleSort('source')}>
                Source {sortField === 'source' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th className="plan-th-dest" onClick={() => toggleSort('dest')}>
                Destination {sortField === 'dest' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPlans.map((plan) => (
              <tr key={plan.id} className={`plan-row ${plan.action === 'skip' ? 'skipped' : ''} ${selectedIds.has(plan.id) ? 'selected' : ''}`}>
                <td className="plan-td-check">
                  <input type="checkbox" checked={selectedIds.has(plan.id)} onChange={() => toggleSelect(plan.id)} />
                </td>
                <td className="plan-td-action">
                  <span className={`action-badge action-${plan.action}`}>{plan.action}</span>
                </td>
                <td className="plan-td-source text-mono" title={plan.sourcePath}>
                  {plan.sourcePath}
                </td>
                <td className="plan-td-dest text-mono" title={plan.destinationPath}>
                  {plan.destinationPath || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredPlans.length === 0 && (
          <div className="plan-empty">No plan items to display</div>
        )}
      </div>
    </div>
  );
};
