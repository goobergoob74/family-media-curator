import React, { useState, useEffect } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { MenuBar } from './components/layout/MenuBar';
import { NavigatorPanel } from './components/browser/NavigatorPanel';
import { PreviewPanel } from './components/preview/PreviewPanel';
import { JobsPanel } from './components/jobs/JobsPanel';
import { StatusBar } from './components/layout/StatusBar';
import { useAppStore } from './store/appStore';
import './styles/app.css';

const App: React.FC = () => {
  const { version, stats, loadStats } = useAppStore();

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="app">
      <TitleBar version={version} />
      <MenuBar />
      <div className="app-body">
        <NavigatorPanel />
        <div className="panel-divider" />
        <PreviewPanel />
        <div className="panel-divider" />
        <JobsPanel />
      </div>
      <StatusBar stats={stats} />
    </div>
  );
};

export default App;
