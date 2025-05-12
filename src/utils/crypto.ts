const getKeyFromPassword = async (password: string, salt: Uint8Array) => {
    const enc = new TextEncoder();
    try {
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
  
      return crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.error('Key derivation failed:', error);
      throw new Error('Failed to derive key from password');
    }
  };
  
  export const encryptData = async (text: string, password: string) => {
    try {
      const enc = new TextEncoder();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const key = await getKeyFromPassword(password, salt);
      const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
  
      const encryptedData = {
        ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
        iv: btoa(String.fromCharCode(...iv)),
        salt: btoa(String.fromCharCode(...salt)),
      };
  
      // Return as a string to ensure consistent storage
      return JSON.stringify(encryptedData);
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  };
  
  export const decryptData = async (encrypted: string, password: string) => {
    try {
      // Parse the encrypted data
      let encryptedData;
      try {
        encryptedData = JSON.parse(encrypted);
      } catch (e) {
        console.error('Failed to parse encrypted data:', e);
        throw new Error('Invalid encrypted data format');
      }
  
      if (!encryptedData.ciphertext || !encryptedData.iv || !encryptedData.salt) {
        throw new Error('Invalid encrypted data structure');
      }
  
      try {
        const dec = new TextDecoder();
        const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0));
        const salt = Uint8Array.from(atob(encryptedData.salt), c => c.charCodeAt(0));
        const data = Uint8Array.from(atob(encryptedData.ciphertext), c => c.charCodeAt(0));
  
        const key = await getKeyFromPassword(password, salt);
        
        // Add additional error handling for the decrypt operation
        const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
        
        return dec.decode(plainBuffer);
      } catch (error: any) {
        if (error.name === 'OperationError') {
          console.error('Decryption operation failed (typically occurs with incorrect password or corrupted data):', error);
          throw new Error('Failed to decrypt data. Please restart SolGen.');
        }
        throw error;
      }
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data. Please restart SolGen.');
    }
  };
  