import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { Keypair } from '@solana/web3.js';
import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
} else if (typeof global !== 'undefined') {
  (global as any).Buffer = Buffer;
}


export const generateSeedPhrase = () => bip39.generateMnemonic(256);

export const deriveSolanaWallets = (mnemonic: string, count = 5) => {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const wallets = [];

  for (let i = 0; i < count; i++) {
    const path = `m/44'/501'/${i}'/0'`;
    const { key } = derivePath(path, seed.toString('hex'));
    const keypair = Keypair.fromSeed(key.slice(0, 32));
    wallets.push({
      address: keypair.publicKey.toBase58(),
      privateKey: Buffer.from(keypair.secretKey).toString('hex'),
    });
  }

  return wallets;
};
