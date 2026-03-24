// Suppress all console output in production
if (import.meta.env.PROD) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.debug = () => {};
  console.info = () => {};
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.tsx'
import { initSentry } from './lib/sentry'

initSentry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
)
