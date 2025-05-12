import { 
    Connection, 
    Keypair, 
    LAMPORTS_PER_SOL, 
    PublicKey, 
    SystemProgram, 
    Transaction, 
    sendAndConfirmTransaction
} from '@solana/web3.js';

// Function to get RPC endpoints based on default and user-configured settings
const getRpcEndpoints = () => {
    // Default endpoints
    const defaultEndpoints = [
        'https://solana-rpc.publicnode.com',
        'https://api.mainnet-beta.solana.com',
    ];

    // Check if user has overridden the RPC endpoints in settings
    const userConfiguredEndpoint = window.env?.RPC_ENDPOINT;

    // If user has configured an endpoint, use it as the only endpoint
    if (userConfiguredEndpoint) {
        return [userConfiguredEndpoint];
    }

    // Otherwise, return the default endpoints
    return defaultEndpoints;
};

// Create a connection with the first endpoint
let currentEndpointIndex = 0;
let RPC_ENDPOINTS = getRpcEndpoints();
let connection = new Connection(RPC_ENDPOINTS[currentEndpointIndex], {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
});

// Function to refresh the connection when settings are updated
export const refreshConnection = () => {
    RPC_ENDPOINTS = getRpcEndpoints();
    currentEndpointIndex = 0; // Reset to the first endpoint
    connection = new Connection(RPC_ENDPOINTS[currentEndpointIndex], {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
    });
    console.log("Connection refreshed. Using endpoint:", RPC_ENDPOINTS[currentEndpointIndex]);
};

// Function to switch to the next endpoint if one fails
const switchToNextEndpoint = () => {
    currentEndpointIndex = (currentEndpointIndex + 1) % RPC_ENDPOINTS.length;
    console.log(`Switching to RPC endpoint: ${RPC_ENDPOINTS[currentEndpointIndex]}`);
    connection = new Connection(RPC_ENDPOINTS[currentEndpointIndex], {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
    });
};

// Log available endpoints on startup
console.log("Available RPC endpoints:", RPC_ENDPOINTS);
console.log("Starting with endpoint:", RPC_ENDPOINTS[currentEndpointIndex]);

// Request throttling configuration
// Get delay from config or use default
const getRequestDelay = () => {
    const configDelay = window.env?.REQUEST_DELAY;
    return configDelay ? parseInt(configDelay, 10) : 2000;
};

let DELAY_BETWEEN_REQUESTS = getRequestDelay();
let lastRequestTime = 0;

// Function to delay execution to avoid rate limiting
const delayRequest = async () => {
    // Refresh the delay value in case it was updated in settings
    DELAY_BETWEEN_REQUESTS = getRequestDelay();
    
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < DELAY_BETWEEN_REQUESTS && lastRequestTime !== 0) {
        const delayTime = DELAY_BETWEEN_REQUESTS - timeSinceLastRequest;
        console.log(`Delaying request by ${delayTime}ms to avoid rate limiting`);
        await new Promise(resolve => setTimeout(resolve, delayTime));
    }
    
    lastRequestTime = Date.now();
};

export async function getSolBalance(address: string): Promise<number> {
    let attempts = 0;
    const maxAttempts = RPC_ENDPOINTS.length * 2; // Try each endpoint up to twice
    
    while (attempts < maxAttempts) {
        try {
            // Delay the request to avoid rate limiting
            await delayRequest();
            
            // Validate the address format
            if (!address || address.trim() === '') {
                console.error("Invalid address provided:", address);
                throw new Error("Invalid address format");
            }
            
            console.log(`Fetching balance for address: ${address} (attempt ${attempts + 1}/${maxAttempts})`);
            console.log(`Using endpoint: ${RPC_ENDPOINTS[currentEndpointIndex]}`);
            
            const publicKey = new PublicKey(address);
            const balance = await connection.getBalance(publicKey);
            
            console.log(`Balance received for ${address}: ${balance} lamports (${balance / LAMPORTS_PER_SOL} SOL)`);
            
            return balance / LAMPORTS_PER_SOL;
        } catch (err: any) {
            console.error(`Error fetching balance (attempt ${attempts + 1}/${maxAttempts}):`, err);
            console.error(`Error details:`, JSON.stringify(err, null, 2));
            
            // Check if this is a rate limit or forbidden error
            if (err.message && (
                err.message.includes('403') || 
                err.message.includes('429') || 
                err.message.includes('Access forbidden') ||
                err.message.includes('Too many requests') ||
                err.message.includes('Rate limit')
            )) {
                console.log("Rate limit or access error detected, switching endpoint...");
                switchToNextEndpoint();
                attempts++;
                // Small delay before retry
                await new Promise(resolve => setTimeout(resolve, 500));
                continue;
            }
            
            // For invalid address format errors, don't keep retrying
            if (err.message && (
                err.message.includes('Invalid public key input') || 
                err.message.includes('Invalid address format')
            )) {
                throw new Error(`Invalid address format: ${err.message}`);
            }
            
            // Network or other temporary issues, retry with next endpoint
            switchToNextEndpoint();
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
        }
    }
    
    throw new Error('Failed to fetch balance after trying all endpoints');
}

export const sendSolBatch = async (fromPrivateKey: string, recipients: string[], amount: number): Promise<string> => {
    let attempts = 0;
    const maxAttempts = RPC_ENDPOINTS.length * 2; // Try each endpoint up to twice
    
    while (attempts < maxAttempts) {
        try {
            // Delay the request to avoid rate limiting
            await delayRequest();
            
            // Parse the private key properly
            let privateKeyArray: number[];
            try {
                privateKeyArray = JSON.parse(fromPrivateKey);
            } catch {
                // If JSON parsing fails, try parsing as hex string
                privateKeyArray = Array.from(Buffer.from(fromPrivateKey, 'hex'));
            }
            
            const fromKeypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
            const fromPubKey = fromKeypair.publicKey;
    
            // Create a Transaction instance
            const transaction = new Transaction();
    
            // Add transfer instructions for each recipient
            recipients.forEach((recipient) => {
                const transferInstruction = SystemProgram.transfer({
                    fromPubkey: fromPubKey,
                    toPubkey: new PublicKey(recipient),
                    lamports: amount * LAMPORTS_PER_SOL,
                });
                transaction.add(transferInstruction);
            });
    
            // Get the latest blockhash (with delay)
            await delayRequest();
            const { blockhash } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = fromPubKey;
    
            // Send and confirm transaction
            const signature = await sendAndConfirmTransaction(
                connection,
                transaction,
                [fromKeypair],
                {
                    commitment: 'confirmed',
                    skipPreflight: false,
                    preflightCommitment: 'confirmed',
                    maxRetries: 3
                }
            );
    
            console.log("Batch transfer completed, Signature:", signature);
            return signature;
        } catch (err: any) {
            console.error(`Error sending transaction (attempt ${attempts + 1}/${maxAttempts}):`, err);
            
            // Check if this is a rate limit or forbidden error
            if (err.message && (
                err.message.includes('403') || 
                err.message.includes('429') || 
                err.message.includes('Access forbidden') ||
                err.message.includes('Too many requests') ||
                err.message.includes('Rate limit')
            )) {
                console.log("Rate limit or access error detected, switching endpoint...");
                switchToNextEndpoint();
                attempts++;
                // Small delay before retry
                await new Promise(resolve => setTimeout(resolve, 500));
                continue;
            }
            
            throw new Error(`Transaction failed: ${err.message}`);
        }
    }
    
    throw new Error('Failed to send transaction after trying all endpoints');
};
