// Console overrides to prevent unwanted logs
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;


// Override console.warn
console.warn = (...args) => {
  // Filter out React Router warnings
  if (typeof args[0] === 'string' && 
      (args[0].includes('React Router Future Flag Warning') ||
       args[0].includes('v7_startTransition') ||
       args[0].includes('v7_relativeSplatPath'))) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

// Override console.error
console.error = (...args) => {
  // Filter out specific errors we want to ignore
  const ignoredErrors = [
    'maps.googleapis.com',
    'via.placeholder.com',
    'ERR_BLOCKED_BY_CLIENT',
    'React Router Future Flag Warning'
  ];
  
  if (!args.some(arg => 
    typeof arg === 'string' && 
    ignoredErrors.some(ignored => arg.includes(ignored))
  )) {
    originalConsoleError.apply(console, args);
  }
};

// Override console.log in production only
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
} else {
  // In development, filter out specific logs
  console.log = (...args) => {
    const ignoredLogs = [
      'maps.googleapis.com',
      'via.placeholder.com'
    ];
    
    if (!args.some(arg => 
      typeof arg === 'string' && 
      ignoredLogs.some(ignored => arg.includes(ignored))
    )) {

    }
  };
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
