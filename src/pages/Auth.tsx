import React, { useState, useEffect } from 'react';
import { getData, saveData } from '../utils/storage';
import { Lock, Unlock } from 'lucide-react';
import toast from 'react-hot-toast';

const Auth: React.FC<{ onAuthSuccess: () => void }> = ({ onAuthSuccess }) => {
  const [step, setStep] = useState<'setup' | 'login'>('setup');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const storedHash = await getData('auth_hash');
      if (storedHash) setStep('login');
    })();
  }, []);

  const hashPassword = async (pass: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pass);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  };

  const handleAuth = async () => {
    if (!password) return;

    const hash = await hashPassword(password);

    if (step === 'setup') {
      await saveData('auth_hash', hash);
      await chrome.storage.local.set({ auth_pass: password });
      toast.success('Password created successfully! Please sign in.');
      setStep('login');
      setPassword('');
    } else {
      const storedHash = await getData('auth_hash');
      if (hash === storedHash) {
        // await chrome.storage.local.set({ auth_pass: password });
        onAuthSuccess();
      } else {
        setError('Incorrect password.');
      }
    }
  };

  return (
    <div className="w-full h-[600px] flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-100 to-blue-100 rounded-md shadow-lg space-y-4 font-inter">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-purple-400 mb-1 font-cherry">
          {step === 'setup' ? 'Welcome to SolGen!' : 'Welcome Back!'}
        </h1>
        <h2 className="text-md text-gray-700">
          {step === 'setup' ? 'Set your password' : 'Enter your password'}
        </h2>
      </div>

      <input
        type="password"
        placeholder="***********"
        className="w-full max-w-xs px-4 py-2 rounded-md bg-white text-center text-black focus:outline-none focus:none"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleAuth();
          }
        }}
        autoFocus
      />

      {error && <p className="text-sm text-red-500 font-semibold">{error}</p>}

      <button
        onClick={handleAuth}
        className="flex items-center font-hand gap-2 bg-purple-400 hover:bg-purple-600 text-white px-6 py-2 rounded-full shadow font-bold transition duration-300 focus:outline-none"
      >
        {step === 'setup' ? <Lock size={18} /> : <Unlock size={18} />}
        {step === 'setup' ? 'Create Password' : 'Unlock SolGen'}
      </button>
    </div>
  );
};

export default Auth;
