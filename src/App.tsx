// This file contains functions for encrypting and decrypting data using the Web Crypto API.
import { useState, useEffect } from 'react';
import Auth from './pages/Auth';
import Popup from './pages/Popup';
import { Buffer } from 'buffer';
import process from 'process';
import { getData, saveData } from './utils/storage';

(window as any).Buffer = Buffer;
(window as any).process = process;

const SESSION_TIMEOUT = 60000; // 1 minute in milliseconds

const App = () => {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const extensionClosedAt = await getData('extensionClosedAt');
      const currentTime = Date.now();

      if (extensionClosedAt && (currentTime - extensionClosedAt < SESSION_TIMEOUT)) {
        setAuthenticated(true);
      } else {
        await saveData('extensionClosedAt', currentTime);
        setAuthenticated(false);
      }
    };

    checkSession();

    const handleExtensionClose = async () => {
      await saveData('extensionClosedAt', Date.now());
    };

    window.addEventListener('beforeunload', handleExtensionClose);

    return () => {
      window.removeEventListener('beforeunload', handleExtensionClose);
    };
  }, []);

  return authenticated ? <Popup /> : <Auth onAuthSuccess={() => setAuthenticated(true)} />;
};

export default App;
