import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChatApp } from './components/ChatApp';
import './styles/globals.css';

// Initialize VS Code API
declare global {
  interface Window {
    acquireVsCodeApi(): any;
  }
}

const vscode = window.acquireVsCodeApi();

// Create root and render React app
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<ChatApp vscode={vscode} />);