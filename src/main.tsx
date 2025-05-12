// Import configuration first to ensure environment variables are loaded
import './config';

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Toaster } from 'react-hot-toast'

// initializing the app with a small delay to ensure config is loaded
setTimeout(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
      <Toaster/>
    </StrictMode>,
  );
}, 100); // the small delay to ensure config initialization completes
