import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChatApp } from './components/ChatApp';
import { WikiApp } from './components/WikiApp';
import './styles/globals.css';
import '@vscode/codicons/dist/codicon.css';

// Initialize VS Code API
declare global {
  interface Window {
    acquireVsCodeApi(): any;
    WAVE_VIEW_TYPE?: string;
  }
}

const vscode = window.acquireVsCodeApi();

// Create root and render React app
const root = ReactDOM.createRoot(document.getElementById('root')!);

const viewType = window.WAVE_VIEW_TYPE || 'chat';
console.log('React index.tsx: window.WAVE_VIEW_TYPE is:', window.WAVE_VIEW_TYPE);
console.log('React index.tsx: viewType is:', viewType);

if (viewType === 'wiki') {
  console.log('Rendering WikiApp');
  root.render(<WikiApp vscode={vscode} />);
} else {
  console.log('Rendering ChatApp');
  root.render(<ChatApp vscode={vscode} />);
}