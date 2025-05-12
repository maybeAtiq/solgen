import { useState } from 'react';
import * as bip39 from 'bip39';

const RecoverModal = ({
  onRecover,
  onClose,
}: {
  onRecover: (seed: string, count: number) => void;
  onClose: () => void;
}) => {
  const [seed, setSeed] = useState('');
  const [count, setCount] = useState(1);
  const [error, setError] = useState('');

  const handleRecover = () => {
    const cleaned = seed.trim().toLowerCase().replace(/\s+/g, ' ');
    const wordCount = cleaned.split(' ').length;

    if (![12, 24].includes(wordCount)) {
      setError('Seed phrase must be 12 or 24 words.');
      return;
    }

    if (!bip39.validateMnemonic(cleaned)) {
      setError('Invalid seed phrase. Please check for typos.');
      return;
    }

    setError('');
    onRecover(cleaned, count);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[90%] max-w-md space-y-4">
        <h2 className="text-lg font-bold text-green-600">Recover Seed Phrase</h2>
        <textarea
          placeholder="Paste your seed phrase here..."
          className="w-full border rounded p-2 px-4 text-sm  bg-white text-center text-black"
          rows={5}
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
        />
        <div className="flex items-center justify-center space-x-2">
        <button
            onClick={() => setCount((prev) => Math.max(1, prev - 1))}
            className="p-1 bg-transparent text-black text-lg font-bold rounded-full hover:bg-transparent hover: border-none focus:outline-none"
        >
            −
        </button>
        <input
            type="number"
            min={1}
            className="w-16 text-center border p-1 rounded bg-white text-black [&::-webkit-inner-spin-button]:appearance-none"
            value={count}
            onChange={(e) => {
            const val = Math.max(1, Number(e.target.value));
            setCount(val);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRecover();
              }
            }}
            autoFocus
        />
        <button
            onClick={() => setCount((prev) => prev + 1)}
            className="p-1 bg-transparent text-black text-lg font-bold rounded-full hover:bg-transparent hover: border-none focus:outline-none"
        >
            +
        </button>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="bg-gray-300 px-3 py-1 rounded focus:outline-none">
            Cancel
          </button>
          <button
            onClick={handleRecover}
            className="bg-green-700 hover:bg-green-800 text-white px-3 py-1 rounded focus:outline-none"
          >
            Recover
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecoverModal;
