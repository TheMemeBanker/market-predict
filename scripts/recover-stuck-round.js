/**
 * Script to recover funds from a stuck prediction round
 *
 * Usage: node scripts/recover-stuck-round.js <round_pda>
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config
const RPC_URL = 'https://api.mainnet-beta.solana.com';
const PREDICTION_PROGRAM_ID = new PublicKey('GG4SHU9dJNRGrWfWXmtDtFsX2jpYEhKjHkZBdn5X8fzt');
const PYTH_SOL_USD_FEED = new PublicKey('H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG');
const FEE_WALLET = new PublicKey('2UKsxbxSYdgspSA5CWZUbYjDgztYttTNDCeua4zNyJgH');

// Load IDL
const IDL_PATH = path.join(__dirname, '../src/idl/prediction_game.json');

async function main() {
  const roundPdaArg = process.argv[2];
  if (!roundPdaArg) {
    console.log('Usage: node scripts/recover-stuck-round.js <round_pda>');
    console.log('Example: node scripts/recover-stuck-round.js 8Z1H4b1wwExGby4tMH6SLazmWMDVpQMKaw99GTBrnx8h');
    process.exit(1);
  }

  const roundPda = new PublicKey(roundPdaArg);

  // Load authority wallet (spinner-authority is the prediction game admin)
  const authorityPath = process.env.HOME + '/.solana/spinner-authority.json';
  if (!fs.existsSync(authorityPath)) {
    console.error('Authority wallet not found at:', authorityPath);
    process.exit(1);
  }
  const authorityKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(authorityPath, 'utf-8')))
  );
  console.log('Authority:', authorityKeypair.publicKey.toBase58());

  // Load IDL
  const idl = JSON.parse(fs.readFileSync(IDL_PATH, 'utf-8'));

  // Setup connection and provider
  const connection = new Connection(RPC_URL, 'confirmed');
  const wallet = new Wallet(authorityKeypair);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  });

  const program = new Program(idl, provider);

  // Get config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('prediction-config')],
    PREDICTION_PROGRAM_ID
  );
  console.log('Config PDA:', configPda.toBase58());

  // Check current round status
  console.log('\n--- Checking Round Status ---');
  try {
    const round = await program.account.predictionRound.fetch(roundPda);
    console.log('Round ID:', round.roundId.toString());
    console.log('Up Pool:', round.upPool.toString(), 'lamports');
    console.log('Down Pool:', round.downPool.toString(), 'lamports');
    console.log('Status:', Object.keys(round.status)[0]);

    if (round.status.settled) {
      console.log('\n✓ Round is already settled!');
      return;
    }
    if (round.status.cancelled) {
      console.log('\n✓ Round is already cancelled - players can claim refunds');
      return;
    }

    // Step 1: Lock the round
    if (round.status.active) {
      console.log('\n--- Step 1: Locking Round ---');
      try {
        const lockTx = await program.methods
          .lockRound()
          .accounts({
            config: configPda,
            round: roundPda,
            pythPriceFeed: PYTH_SOL_USD_FEED,
            authority: authorityKeypair.publicKey,
          })
          .signers([authorityKeypair])
          .rpc();
        console.log('Lock TX:', lockTx);
        console.log('✓ Round locked!');

        // Wait for confirmation
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        console.error('Lock failed:', err.message);
        // Check if already locked
        const updatedRound = await program.account.predictionRound.fetch(roundPda);
        if (updatedRound.status.locked) {
          console.log('Round was already locked, continuing...');
        } else {
          throw err;
        }
      }
    }

    // Step 2: Settle the round
    console.log('\n--- Step 2: Settling Round ---');
    try {
      const settleTx = await program.methods
        .settleRound()
        .accounts({
          config: configPda,
          round: roundPda,
          pythPriceFeed: PYTH_SOL_USD_FEED,
          feeWallet: FEE_WALLET,
          authority: authorityKeypair.publicKey,
        })
        .signers([authorityKeypair])
        .rpc();
      console.log('Settle TX:', settleTx);
      console.log('✓ Round settled!');
    } catch (err) {
      console.error('Settle failed:', err.message);
      throw err;
    }

    // Check final status
    const finalRound = await program.account.predictionRound.fetch(roundPda);
    const finalStatus = Object.keys(finalRound.status)[0];
    console.log('\n--- Final Status ---');
    console.log('Status:', finalStatus);

    if (finalStatus === 'cancelled') {
      console.log('\n✓ Round was CANCELLED because no bets on one side');
      console.log('✓ Player(s) can now call claim_refund to get their SOL back!');
    } else if (finalStatus === 'settled') {
      console.log('\n✓ Round was SETTLED');
      console.log('Winner:', Object.keys(finalRound.winningDirection)[0].toUpperCase());
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

main().catch(console.error);
