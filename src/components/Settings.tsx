import { useState } from 'react';
import { saveConfig } from '../config';
import toast from 'react-hot-toast';
import { refreshConnection } from '../utils/solana-transfer';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const [rpcEndpoint, setRpcEndpoint] = useState(window.env.RPC_ENDPOINT || '');
  const [requestDelay, setRequestDelay] = useState(window.env.REQUEST_DELAY || '2000');

  const handleSave = async () => {
    try {
      await saveConfig({ RPC_ENDPOINT: rpcEndpoint, REQUEST_DELAY: requestDelay });
      refreshConnection(); // Refresh the connection with the new settings
      toast.success('Settings saved successfully');
      onClose();
    } catch (error) {
      
      toast.error('Failed to save settings');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white rounded p-6 w-[400px] space-y-4">
        <h2 className="text-lg font-semibold">Settings</h2>
        <div className="space-y-2 font-inter">
          <label className="block text-sm font-medium text-gray-700">
            RPC Endpoint (Optional)
          </label>
          <input
            type="text"
            value={rpcEndpoint}
            onChange={(e) => setRpcEndpoint(e.target.value)}
            className="w-full border border-gray-300 bg-white text-black rounded px-2 py-1"
          />
          <p className="text-xs text-gray-500 font-hand">
            Enter RPC. Currently using (PublicNode, Solana Mainnet).
          </p>
        </div>
        <div className="space-y-2 font-inter">
          <label className="block text-sm font-medium text-gray-700">
            Request Delay (ms)
          </label>
          <input
            type="number"
            value={requestDelay}
            onChange={(e) => setRequestDelay(e.target.value)}
            className="w-full border border-gray-300 bg-white text-black rounded px-2 py-1 [&::-webkit-inner-spin-button]:appearance-none"
          />
          <p className="text-xs text-gray-500 font-hand">
            Delay between API requests in milliseconds. Higher values reduce rate limiting.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 rounded bg-gray-200 focus:outline-none hover: border-none">
            Cancel
          </button>
          <button onClick={handleSave} className="px-3 py-1 bg-blue-600 text-white rounded focus:outline-none hover: border-none">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;