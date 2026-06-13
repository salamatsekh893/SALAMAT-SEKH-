import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign developer console warnings and unhandled WebSocket errors
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && (
      String(event.reason).includes('WebSocket') || 
      String(event.reason.message || '').includes('WebSocket') || 
      String(event.reason.message || '').includes('vite')
    )) {
      event.preventDefault();
    }
  });

  const originalWarn = console.warn;
  console.warn = (...args) => {
    const msg = args[0]?.toString() || '';
    if (msg.includes('The width') && msg.includes('and height') && msg.includes('chart')) {
      return; // Suppress Recharts ResponsiveContainer warning
    }
    originalWarn(...args);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
