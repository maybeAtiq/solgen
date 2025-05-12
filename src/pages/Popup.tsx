import { useEffect, useState } from 'react';
import MassDepositModal from '../components/MassDepositModal';
import { getSolBalance, sendSolBatch } from '../utils/solana-transfer';
import { generateSeedPhrase, deriveSolanaWallets } from '../utils/solana';
import { decryptData, encryptData } from '../utils/crypto';
import { saveData, getData } from '../utils/storage';
import { PlusCircle, FileDown, RefreshCwIcon, CopyIcon, RotateCw, ArrowUpRight, Trash2, X, Settings as SettingsIcon } from 'lucide-react';
import RecoverModal from '../components/RecoverModal';
import toast from 'react-hot-toast';
import Spinner from '../components/Spinner';
import Settings from '../components/Settings';

interface Wallet {
  address: string;
  privateKey: string;
  balance?: number;
}

interface WalletData {
  seed: string;
  wallets: Wallet[];
}

const WithdrawModal = ({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (address: string) => void;
}) => {
  const [address, setAddress] = useState('');

  const handleSubmit = () => {
    if (address.trim()) {
      onSubmit(address.trim());
      setAddress('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center font-hand">
      <div className="bg-white rounded p-6 w-[300px] space-y-4">
        <h2 className="text-lg font-semibold font-hand text-gray-200">Withdraw all funds</h2>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter Solana address"
          className="w-full border font-inter border-gray-300 bg-white text-black rounded px-2 py-1"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 rounded bg-gray-200 focus:outline-none hover:bg-gray-300 border-none">
            Cancel
          </button>
          <button onClick={handleSubmit} className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 focus:outline-none">
            Withdraw
          </button>
        </div>
      </div>
    </div>
  );
};

const Popup = () => {
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [password, setPassword] = useState<string>('');
  const [showRecoverModal, setShowRecoverModal] = useState(false);
  const [showCountInput, setShowCountInput] = useState(false);
  const [count, setCount] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedSeed, setSelectedSeed] = useState<WalletData | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const SESSION_TIMEOUT = 60000; // 1 minute in milliseconds

  useEffect(() => {
    // Set up extension close listener
    const handleExtensionClose = async () => {
      await saveData('extensionClosedAt', Date.now());
    };

    // Add listener for extension close
    window.addEventListener('beforeunload', handleExtensionClose);

    // Check session and load wallets
    const checkSessionAndLoadWallets = async () => {
      try {
        const extensionClosedAt = await getData('extensionClosedAt');
        const auth_pass = await getData('auth_pass');
        const wallets_encrypted = await getData('wallets_encrypted');
        const currentTime = Date.now();

        // Check if extension was closed less than 1 minute ago
        if (extensionClosedAt && (currentTime - extensionClosedAt < SESSION_TIMEOUT)) {
          // Session is still valid
          if (auth_pass) {
            setPassword(auth_pass);
            setLoading(true);
            await loadWallets(auth_pass, wallets_encrypted);
            setLoading(false);
          }
        } else {
          // Session expired, clear session data but keep wallets
          await chrome.storage.local.remove(['extensionClosedAt']);
          // Don't clear wallets_encrypted, just reload to trigger re-auth
          window.location.reload();
        }
      } catch (err) {
        console.error('Session check failed:', err);
        window.location.reload();
      }
    };

    checkSessionAndLoadWallets();

    // Cleanup listener
    return () => {
      window.removeEventListener('beforeunload', handleExtensionClose);
    };
  }, []);

  const loadWallets = async (auth_pass: string, wallets_encrypted: string | null) => {
    try {
      // Check if we have encrypted wallet data
      if (!wallets_encrypted) {
        console.log('No wallet data found in storage');
        setWallets([]);
        return;
      }

      // Try decryption with retries
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          // Ensure the encrypted data is a valid JSON string
          if (typeof wallets_encrypted !== 'string') {
            throw new Error('Encrypted data is not a valid string');
          }

          console.log('Attempting to decrypt data...');
          const decrypted = await decryptData(wallets_encrypted, auth_pass);
          console.log('Decryption successful');
          let parsed;
          try {
            parsed = JSON.parse(decrypted);
          } catch (parseErr) {
            console.error('Failed to parse decrypted data:', parseErr);
            throw new Error('Invalid wallet data format after decryption');
          }
          
          if (!Array.isArray(parsed)) {
            console.error('Parsed data is not an array:', parsed);
            throw new Error('Invalid wallet data format - expected array');
          }
          
          // Clear existing wallets to avoid duplication
          setWallets([]);
          
          // Update wallets in batches and load balances immediately
          const batchSize = 5;
          for (let i = 0; i < parsed.length; i += batchSize) {
            const batch = parsed.slice(i, i + batchSize);
            // Load balances for each wallet in the batch
            for (const walletGroup of batch) {
              for (const wallet of walletGroup.wallets) {
                try {
                  const balance = await getSolBalance(wallet.address);
                  wallet.balance = balance;
                } catch (err) {
                  console.error('Failed to load balance:', err);
                  wallet.balance = 0;
                }
              }
            }
            setWallets(prev => [...prev, ...batch]);
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          console.log('Wallet data loaded successfully');
          return;
        } catch (decryptErr) {
          console.error(`Decryption attempt ${retryCount + 1} failed:`, decryptErr);
          retryCount++;
          if (retryCount === maxRetries) {
            throw decryptErr;
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (err: any) {
      console.error('Failed to load wallets:', err);
      // Set empty wallets array to start fresh
      setWallets([]);
      toast.error(err.message || 'Failed to load wallets. Please restart SolGen.');
    }
  };

  const generateAndStore = async () => {
    try {
      setLoading(true);
      const seed = generateSeedPhrase();
      const derived = deriveSolanaWallets(seed, count);
      
      // Load balances for new wallets
      const walletsWithBalance = await Promise.all(derived.map(async (wallet) => {
        try {
          const balance = await getSolBalance(wallet.address);
          return { ...wallet, balance };
        } catch (err) {
          console.error('Failed to load balance:', err);
          return { ...wallet, balance: 0 };
        }
      }));

      const newWallets = [...wallets, { seed, wallets: walletsWithBalance }];
      
      // Update UI immediately
      setWallets(newWallets);
      setShowCountInput(false);
      setCount(1);

      // Then save to storage
      const encrypted = await encryptData(JSON.stringify(newWallets), password);
      if (saving) return;
      setSaving(true);
      await saveData('wallets_encrypted', encrypted);
      setSaving(false);
      toast.success('New wallets generated successfully!');
    } catch (err: any) {
      console.error('Failed to generate wallets:', err);
      toast.error(err.message || 'Failed to generate wallets');
      setSaving(false);
    } finally {
      setLoading(false);
    }
  };

  const deleteSeed = async (seedIndex: number) => {
    if (confirm("Are you sure you want to delete this seed and all its wallets? This action cannot be undone.")) {
      try {
        setSaving(true);
        const updatedWallets = wallets.filter((_, index) => index !== seedIndex);
        setWallets(updatedWallets);
        
        // Save updated wallets to storage
        const encrypted = await encryptData(JSON.stringify(updatedWallets), password);
        await saveData('wallets_encrypted', encrypted);
        toast.success("Seed deleted successfully");
      } catch (err) {
        console.error("Failed to delete seed:", err);
        toast.error("Failed to delete seed");
      } finally {
        setSaving(false);
      }
    }
  };

  const deleteWallet = async (seedIndex: number, walletIndex: number) => {
    try {
      setSaving(true);
      const updatedWallets = [...wallets];
      
      // If it's the only wallet in the seed, delete the whole seed
      if (updatedWallets[seedIndex].wallets.length === 1) {
        return deleteSeed(seedIndex);
      }
      
      // Otherwise, remove just the wallet
      updatedWallets[seedIndex].wallets = updatedWallets[seedIndex].wallets.filter((_, idx) => idx !== walletIndex);
      
      setWallets(updatedWallets);
      
      // Save updated wallets to storage
      const encrypted = await encryptData(JSON.stringify(updatedWallets), password);
      await saveData('wallets_encrypted', encrypted);
      toast.success("Wallet deleted successfully");
    } catch (err) {
      console.error("Failed to delete wallet:", err);
      toast.error("Failed to delete wallet");
    } finally {
      setSaving(false);
    }
  };

  // Modify handleMassDeposit to handle insufficient balance
  async function handleMassDeposit(amount: number, entry: WalletData) {
    const sourceWallet = entry.wallets[0];
    const targetWallets = entry.wallets.slice(1);
    if (!targetWallets.length) {
      toast.error("No other wallets to fund.");
      return;
    }

    const toastId = toast.loading("Checking balance...");
    try {
      const balance = await getSolBalance(sourceWallet.address);
      const minBalance = 0.001; // Minimum balance to keep in the source wallet
      const totalNeeded = amount * targetWallets.length;

      if (balance < totalNeeded) {
        toast.remove(toastId);
        toast.error(`Insufficient balance. Deposit in first wallet address: ${sourceWallet.address} and try again`);
        return;
      }
      if (balance - totalNeeded < minBalance) {
        toast.remove(toastId); 
        toast.error(`Not enough balance to keep ${minBalance} SOL in the source wallet. Please deposit more.`);
        return;
      }

      toast.loading("Sending SOL...", { id: toastId });
      const signature = await sendSolBatch(sourceWallet.privateKey, targetWallets.map(w => w.address), amount);
      
      toast.remove(toastId);
      toast.success(`Transaction successful! Signature: ${signature}`);
      
      // Refresh balances after successful transaction
      const updatedWallets = [...wallets];
      const entryIndex = updatedWallets.findIndex(w => w.seed === entry.seed);
      if (entryIndex !== -1) {
        for (const wallet of updatedWallets[entryIndex].wallets) {
          wallet.balance = await getSolBalance(wallet.address);
        }
        setWallets(updatedWallets);
      }
    } catch (err: any) {
      toast.remove(toastId);
      toast.error(err.message || "Transaction failed");
      console.error("Transaction error:", err);
    } finally {
      setShowDepositModal(false);
    }
  }
  
  const downloadTxt = (entry: WalletData) => {
    const content = `Seed Phrase:\n${entry.seed}\n\nWallets:\n` + entry.wallets.map(
      (w, i) => `Wallet ${i + 1}:\nAddress: ${w.address}\nPrivate Key: ${w.privateKey}\n`
    ).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'solana-wallet.txt';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handleRecover = async (seed: string, count: number) => {
    const cleanedSeed = seed.trim();
    const baseSeed = cleanedSeed.toLowerCase();
  
    // Check if we already have wallets
    const existingWallets = [...wallets];
    const exists = existingWallets.some(
      (w) => w.seed.replace(' (imported)', '').toLowerCase() === baseSeed
    );
  
    if (exists) {
      toast.error('This seed phrase has already been imported!');
      return;
    }
  
    try {
      setLoading(true);
      const derived = deriveSolanaWallets(cleanedSeed, count);
      
      // Load balances for recovered wallets
      const walletsWithBalance = await Promise.all(derived.map(async (wallet) => {
        try {
          const balance = await getSolBalance(wallet.address);
          return { ...wallet, balance };
        } catch (err) {
          console.error('Failed to load balance:', err);
          return { ...wallet, balance: 0 };
        }
      }));

      // Use existing wallets or initialize a new array
      const importedWallets = existingWallets.length > 0 
        ? [...existingWallets, { seed: `${cleanedSeed} (imported)`, wallets: walletsWithBalance }]
        : [{ seed: `${cleanedSeed} (imported)`, wallets: walletsWithBalance }];
        
      setWallets(importedWallets);
  
      const encrypted = await encryptData(JSON.stringify(importedWallets), password);
      if (saving) return;
      setSaving(true);
      await saveData('wallets_encrypted', encrypted);
      setSaving(false);      
      setShowRecoverModal(false);
      toast.success('Seed phrase successfully recovered!');
    } catch (err) {
      toast.error('Recovery failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };  

  //clipboard copy function
  const copyToClipboard = async (text: string) => {
    try {
      // Remove "(imported)" text if it's a seed phrase
      const cleanedText = text.replace(' (imported)', '');
      await navigator.clipboard.writeText(cleanedText);
      console.log('copied to clipboard:', cleanedText);
      toast.success('successfully copied!');
    } catch (err) {
      toast.error('Failed to copy, Please try again.');
      console.error('Failed to copy:', err);
    } 
  };

  const addWalletToSeed = async (seedIndex: number) => {
    const entry = wallets[seedIndex];
    const currentCount = entry.wallets.length;
    const newWallet = deriveSolanaWallets(entry.seed.replace(' (imported)', ''), currentCount + 1).slice(-1)[0];
  
    const updatedWallets = [...wallets];
    updatedWallets[seedIndex].wallets.push(newWallet);
  
    setWallets(updatedWallets);
  
    const encrypted = await encryptData(JSON.stringify(updatedWallets), password);
    if (saving) return;
    setSaving(true);
    await saveData('wallets_encrypted', encrypted);
    setSaving(false);    
  
    toast.success('New wallet added under seed!');
  };  
  
  const handleWithdraw = async (targetAddress: string) => {
    if (!selectedSeed) return;

    const toastId = toast.loading("Checking balances...");
    try {
      const walletsWithBalance = selectedSeed.wallets.filter(w => w.balance && w.balance > 0);
      
      if (walletsWithBalance.length === 0) {
        toast.error("No wallets with balance found");
        return;
      }

      for (const wallet of walletsWithBalance) {
        try {
          const originalBalance = await getSolBalance(wallet.address);
          const balance = originalBalance - 0.001; // Leave 0.001 SOL for transaction fees
          if (balance > 0) {
            // Round to 9 decimal places
            const amountToSend = Math.floor((balance) * 1e9) / 1e9;
            if (amountToSend > 0) {
              await sendSolBatch(wallet.privateKey, [targetAddress], amountToSend);
              toast.success(`Withdrawn ${amountToSend.toFixed(4)} SOL from ${wallet.address.slice(0, 4)}...`);
              // Refresh balances after withdrawal
              await refreshBalances(selectedSeed.seed);

              toast.remove(toastId);
              toast.success("Withdrawal completed!");
            }
          }
        } catch (err: any) {
          console.error(`Failed to withdraw from ${wallet.address}:`, err);
          toast.error(`Failed to withdraw from ${wallet.address.slice(0, 4)}...`);
        }
      }


    } catch (err: any) {
      toast.remove(toastId);
      toast.error(err.message || "Withdrawal failed");
    } finally {
      setShowWithdrawModal(false);
      setSelectedSeed(null);
    }
  };

  const refreshBalances = async (seed: string) => {
    const updatedWallets = [...wallets];
    const entryIndex = updatedWallets.findIndex(w => w.seed === seed);
    if (entryIndex !== -1) {
      // Update balances in parallel
      const balancePromises = updatedWallets[entryIndex].wallets.map(async (wallet) => {
        try {
          wallet.balance = await getSolBalance(wallet.address);
        } catch (err) {
          console.error(`Failed to get balance for ${wallet.address}:`, err);
        }
      });
      await Promise.all(balancePromises);
      setWallets(updatedWallets);
    }
  };

  // Update the refresh button click handler
  const handleRefresh = async (entry: WalletData) => {
    const toastId = toast.loading("Checking balances...");
    try {
      const updatedWallets = [...wallets];
      const entryIndex = updatedWallets.findIndex(w => w.seed === entry.seed);
      if (entryIndex !== -1) {
        for (const wallet of updatedWallets[entryIndex].wallets) {
          try {
            wallet.balance = await getSolBalance(wallet.address);
          } catch (err) {
            console.error('Failed to refresh balance:', err);
          }
        }
        setWallets(updatedWallets);
      }
    } catch (err) {
      console.error('Failed to refresh balances:', err);
    } finally {
      toast.remove(toastId);
    }
  };

  return (
    <div className="p-4 w-full h-[600px] font-hand text-black space-y-4 bg-gradient-to-br from-purple-100 to-blue-100 overflow-y-scroll">
      {loading && <Spinner />}
      <div className='flex flex-col items-center justify-start w-full'>
        <div className="flex justify-between items-center w-full">
          <h1 className="text-4xl text-purple-400 mb-4 text-start font-bold font-cherry flex">SolGen<span className='font-hand text-[12px]'>by Atiq</span></h1>
          <button
            onClick={() => setShowSettings(true)}
            className="bg-white p-2 rounded-full hover:bg-white focus:outline-none"
            title="Settings"
          >
            <SettingsIcon className="w-5 h-5 text-purple-400" />
          </button>
        </div>
        <button
          className={`flex items-center gap-2 text-white px-4 py-2 rounded ${saving? 'bg-gray-300 cursor-not-allowed':'bg-purple-500 hover:bg-purple-600 focus:outline-none'}`}
          disabled={saving}
          onClick={() => setShowCountInput(!showCountInput)}
        >
          <PlusCircle className="w-5 h-5" />
          {saving ? 'Saving...' : 'Generate New Seed'}
        </button>

        {showCountInput && (
          <div className="flex flex-col items-center space-y-2 mt-2 p-3 bg-white bg-opacity-50 rounded-t-sm">
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
              />
              <button
                onClick={() => setCount((prev) => prev + 1)}
                className="p-1 bg-transparent text-black text-lg font-bold rounded-full hover:bg-transparent hover: border-none focus:outline-none"
              >
                +
              </button>
            </div>
            <p>number of private keys to generate</p>
            <div className='flex gap-4 mt-2'>
              <button onClick={() => setShowCountInput(false)} className="bg-gray-200  px-4 w-fit py-1 rounded hover:bg-gray-300 border-none focus:outline-none">
                Cancel
              </button>
              <button
                className="bg-purple-500 text-white px-4 py-1 w-fit rounded hover:bg-purple-600 focus:outline-none"
                onClick={generateAndStore}
              >
                Confirm
              </button>              
            </div>

          </div>
        )}
        <button
          className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded mt-2"
          onClick={() => setShowRecoverModal(true)}
        >
          <RefreshCwIcon className='w-5 h-5'/> Recover Seed Phrase
        </button>
      </div>

      {wallets.length === 0 ? (
        <p className="text-gray-500 text-center">No wallets created yet.</p>
      ) : (
        wallets.map((entry, idx) => (
          <div key={idx} className="w-full p-4 bg-gray-50 border rounded-md shadow-sm space-y-2">
              <div className='flex flex-col'>
                <div className='flex justify-between gap-3 items-center w-full mb-2'>
                  <div className='flex gap-1 items-center'>
                    <h2 className="text-lg text-purple-400 font-inter">
                      Seed #{idx + 1}
                      {entry.seed.includes('(imported)') && (
                        <span className="text-sm text-blue-500 ml-1 font-hand">(imported)</span>
                      )}
                    </h2>
                    <div className='gap-1 flex'>                    
                      <PlusCircle onClick={() => addWalletToSeed(idx)} className='w-4 h-4 text-blue-500 hover:text-blue-600 cursor-pointer focus:outline-none'/>
                      <div className="relative group w-fit">
                        <RotateCw
                          onClick={() => handleRefresh(entry)}
                          className="w-4 h-4 text-black hover:text-purple-400 transition-colors cursor-pointer focus:outline-none"
                        />
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                          Refresh wallet balances
                        </span>
                      </div>
                    </div>
                  </div>                    
                  <div className='flex w-fit items-center gap-1'>
                    <button
                      onClick={() => {
                        setSelectedSeed(entry);
                        setShowWithdrawModal(true);
                      }}
                      className="flex flex-col text-md items-center gap-1 bg-gray-50 w-fit text-wrap h-fit text-sm transition-colors hover:border-none focus:outline-none group relative"
                    >
                      <ArrowUpRight className="w-6 h-6 text-purple-600 hover: border-none" />
                      <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                        Withdraw all funds
                      </span>
                        <p className='text-xs text-purple-600 font-inter text-[10px]'>Withdraw</p>
                    </button>
                    <button
                      onClick={() => setShowDepositModal(true)}
                      className="flex flex-col items-center text-md gap-1 w-fit text-wrap h-fit text-sm text-white bg-green-700 hover:bg-green-800 transition-colors focus:outline-none">
                      <p className='text-xs text-white font-inter text-[10px]'>Mass Deposit</p>
                    </button>
                  </div>
                  <MassDepositModal
                    isOpen={showDepositModal}
                    onClose={() => setShowDepositModal(false)}
                    onSubmit={(amount: number) => handleMassDeposit(amount, entry)}
                    />

                </div>
              <p className="text-xs text-gray-700 break-words whitespace-pre-wrap font-inter">
                {entry.seed.replace(' (imported)', '')}
              </p>
              <div className="flex items-center gap-2">
                <CopyIcon
                  className="w-3 h-3 text-textDark cursor-pointer"
                  onClick={() => copyToClipboard(entry.seed)} 
                />
              </div>
              </div>

            {entry.wallets.map((w, i) => (
              <div key={i} className="bg-white p-2 rounded border text-xs space-y-1 font-inter relative">
                <div className="absolute top-1 right-1">
                  <div className="relative group">
                    <X
                      className="w-4 h-4 text-purple-400 hover:text-purple-600 cursor-pointer"
                      onClick={() => deleteWallet(idx, i)}
                    />
                    <span className="absolute -top-8 right-0 font-hand bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                      Delete wallet
                    </span>
                  </div>
                </div>
                <p className="break-words">
                  <strong>Address:</strong> {w.address}
                  <span className="ml-2 text-green-700 text-xs">
                  Bal: {w.balance !== undefined ? `${w.balance} SOL` : "Loading..."}
                  </span>
                </p>
                <CopyIcon className="w-3 h-3 text-textDark cursor-pointer" onClick={() => copyToClipboard(w.address)} />
                <p className="break-words"><strong>Private Key 🗝️:</strong> {w.privateKey}</p>
                <CopyIcon className="w-3 h-3 text-textDark cursor-pointer" onClick={() => copyToClipboard(w.privateKey)} />
              </div>
            ))}

            <div className="flex justify-between items-center mt-2 font-inter">
              <button
                onClick={() => downloadTxt(entry)}
                className="flex items-center gap-1 text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 focus:outline-none"
              >
                <FileDown className="w-4 h-4" />
                Download txt file
              </button>
              
              <button
                onClick={() => deleteSeed(idx)}
                className="flex items-center gap-1 text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 focus:outline-none"
              >
                <Trash2 className="w-4 h-4" />
                Delete seed
              </button>
            </div>
          </div>
        ))
      )}
      {showRecoverModal && (
      <RecoverModal
        onRecover={handleRecover}
        onClose={() => setShowRecoverModal(false)}
      />
    )}
    {showWithdrawModal && (
      <WithdrawModal
        isOpen={showWithdrawModal}
        onClose={() => {
          setShowWithdrawModal(false);
          setSelectedSeed(null);
        }}
        onSubmit={handleWithdraw}
      />
    )}
    {/* Settings Modal */}
    <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};

export default Popup;