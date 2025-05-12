// Configuration for Chrome extension
// This component helps manage API keys and configuration in a way that works in the extension store

declare global {
  interface Window {
    env: Record<string, string>;
  }
}

// Default configuration
const defaultConfig = {
  RPC_ENDPOINT: 'https://solana-rpc.publicnode.com',
  REQUEST_DELAY: '2000',
};

// Initialize configuration
const initConfig = async (): Promise<void> => {
  if (typeof window !== 'undefined') {
    window.env = window.env || {};

    // Merge with defaults
    Object.assign(window.env, defaultConfig);
  }
};

// Function to save configuration
export const saveConfig = async (newConfig: Record<string, string>): Promise<void> => {
  if (typeof window !== 'undefined') {
    window.env = { ...window.env, ...newConfig };
  }
};

// Initialize config immediately
initConfig();

export default window.env;