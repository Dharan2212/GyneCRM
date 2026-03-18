/**
 * GyneCRM Frontend — Application Entry Point
 * Phase 7.1 — Bootstrap only. No routing or auth yet.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App.jsx';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
