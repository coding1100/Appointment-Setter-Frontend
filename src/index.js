import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Suppress MetaMask extension errors in console
const originalError = console.error;
console.error = (...args) => {
  const errorMessage = args[0]?.toString() || '';
  // Filter out MetaMask extension errors
  if (errorMessage.includes('MetaMask') || errorMessage.includes('Failed to connect to MetaMask')) {
    return; // Suppress MetaMask errors
  }
  originalError.apply(console, args);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
