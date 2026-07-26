import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import BN from 'bn.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const PROGRAM_ID = new PublicKey('GG4SHU9dJNRGrWfWXmtDtFsX2jpYEhKjHkZBdn5X8fzt');
const RPC_URL = 'https://api.mainnet-beta.solana.com';
const FEE_WALLET = new PublicKey('2UKsxbxSYdgspSA5CWZUbYjDgztYttTNDCeua4zNyJgH');
const PYTH_SOL_USD_FEED = new PublicKey('H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG');

// Game parameters - use BN for large numbers
const HOUSE_FEE_BPS = 500; // 5%
const MIN_BET_LAMPORTS = new BN(10_000_000); // 0.01 SOL
const ROUND_DURATION_SECONDS = new BN(180); // 3 minutes

async function main() {
  console.log('🔮 Initializing Prediction Game on Mainnet...');
  console.log('============================================');

  // Load authority keypair
  const authorityPath = path.resolve(process.env.HOME, '.solana/spinner-authority.json');
  const authorityKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(authorityPath, 'utf-8')))
  );
  console.log('✅ Authority:', authorityKeypair.publicKey.toBase58());

  // Setup connection and provider
  const connection = new Connection(RPC_URL, 'confirmed');
  const wallet = new Wallet(authorityKeypair);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });

  // Load IDL
  const idlPath = path.resolve(__dirname, '../target/idl/prediction_game.json');
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));

  // Ensure IDL has the correct program address
  idl.address = PROGRAM_ID.toBase58();
  const program = new Program(idl, provider);

  console.log('✅ Program ID:', PROGRAM_ID.toBase58());
  console.log('✅ Fee Wallet:', FEE_WALLET.toBase58());
  console.log('✅ Pyth Feed:', PYTH_SOL_USD_FEED.toBase58());

  // Find config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('prediction-config')],
    PROGRAM_ID
  );
  console.log('✅ Config PDA:', configPda.toBase58());

  // Check if already initialized
  try {
    const existingConfig = await program.account.predictionConfig.fetch(configPda);
    console.log('⚠️  Config already exists!');
    console.log('   Authority:', existingConfig.authority.toBase58());
    console.log('   Fee Wallet:', existingConfig.feeWallet.toBase58());
    console.log('   House Fee:', existingConfig.houseFeeBps, 'bps');
    console.log('   Min Bet:', existingConfig.minBetLamports.toNumber() / 1e9, 'SOL');
    console.log('   Round Duration:', existingConfig.roundDurationSeconds.toNumber(), 'seconds');
    console.log('   Current Round:', existingConfig.currentRoundId.toNumber());
    return;
  } catch (e) {
    console.log('📝 Config not found, initializing...');
  }

  // Initialize
  try {
    const tx = await program.methods
      .initializePrediction(HOUSE_FEE_BPS, MIN_BET_LAMPORTS, ROUND_DURATION_SECONDS)
      .accounts({
        config: configPda,
        authority: authorityKeypair.publicKey,
        feeWallet: FEE_WALLET,
        pythPriceFeed: PYTH_SOL_USD_FEED,
        systemProgram: PublicKey.default,
      })
      .signers([authorityKeypair])
      .rpc();

    console.log('✅ Initialized! TX:', tx);

    // Verify
    const config = await program.account.predictionConfig.fetch(configPda);
    console.log('\n📊 Config Verified:');
    console.log('   Authority:', config.authority.toBase58());
    console.log('   Fee Wallet:', config.feeWallet.toBase58());
    console.log('   House Fee:', config.houseFeeBps, 'bps (', config.houseFeeBps / 100, '%)');
    console.log('   Min Bet:', config.minBetLamports.toNumber() / 1e9, 'SOL');
    console.log('   Round Duration:', config.roundDurationSeconds.toNumber(), 'seconds');
  } catch (err) {
    console.error('❌ Failed to initialize:', err.message);
    throw err;
  }
}

main().catch(console.error);
