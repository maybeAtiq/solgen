import { useState } from 'react';

export default function MassDepositModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => void;
}) {
  const [amount, setAmount] = useState('');

  const handleSubmit = () => {
    const parsed = parseFloat(amount);
    if (!isNaN(parsed) && parsed > 0) {
      onSubmit(parsed);
      setAmount('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white rounded p-6 w-[300px] space-y-4">
        <h2 className="text-lg font-semibold">Airdrop all from Wallet 1</h2>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount (SOL)"
          className="w-full border border-gray-300 bg-white text-black [&::-webkit-inner-spin-button]:appearance-none rounded px-2 py-1"
          autoFocus
          onKeyDown={(e)=>{
            if (e.key === "Enter") {
              handleSubmit()
            }
          }}
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 rounded bg-gray-200 focus:outline-none">
            Cancel
          </button>
          <button onClick={handleSubmit} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none">
            Airdrop
          </button>
        </div>
      </div>
    </div>
  );
}
