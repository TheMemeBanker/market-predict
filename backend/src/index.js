import 'dotenv/config';
import { WebSocketServer } from 'ws';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import fs from 'fs';
import { PredictionManager } from './services/prediction-manager.js';

// Configuration
const PORT = process.env.PORT || 8080;
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const AUTHORITY_KEYPAIR_PATH = process.env.AUTHORITY_KEYPAIR || './authority.json';

console.log('🔮 Market Predict Backend Starting...');
console.log('================================');

// Load authority keypair (optional for demo mode)
let authorityKeypair = null;
try {
  if (fs.existsSync(AUTHORITY_KEYPAIR_PATH)) {
    const keypairData = JSON.parse(fs.readFileSync(AUTHORITY_KEYPAIR_PATH, 'utf-8'));
    authorityKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
    console.log('✅ Authority wallet loaded:', authorityKeypair.publicKey.toBase58());
  }
} catch (err) {
  console.log('⚠️  No authority keypair found, running in demo mode');
}

// Setup Solana connection
const connection = new Connection(RPC_URL, 'confirmed');
console.log('✅ Connected to Solana RPC');

// WebSocket server for clients
const wss = new WebSocketServer({ port: PORT });
const clients = new Set();

// Track prediction game subscribers
const predictionClients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`👤 Client connected (${clients.size} total)`);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to Market Predict',
    serverTime: Date.now(),
  }));

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleClientMessage(ws, message);
    } catch (err) {
      console.error('Failed to parse message:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    predictionClients.delete(ws);
    console.log(`👤 Client disconnected (${clients.size} total)`);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    clients.delete(ws);
    predictionClients.delete(ws);
  });
});

// Handle client messages
function handleClientMessage(ws, message) {
  switch (message.type) {
    case 'subscribe':
      if (message.game === 'prediction') {
        predictionClients.add(ws);

        // Send current prediction state
        if (predictionManager) {
          ws.send(JSON.stringify({
            type: 'round_state',
            ...predictionManager.getRoundState(),
          }));
        }
        console.log(`👤 Client subscribed to prediction game`);
      }
      break;

    case 'place_bet':
      if (predictionClients.has(ws) && predictionManager) {
        try {
          predictionManager.placeBet(message.player, message.direction, message.amount);
          ws.send(JSON.stringify({ type: 'bet_confirmed', success: true }));
        } catch (err) {
          ws.send(JSON.stringify({ type: 'bet_error', error: err.message }));
        }
      }
      break;

    default:
      console.log('Unknown message type:', message.type);
  }
}

// Broadcast to prediction clients
function broadcastPrediction(event, data) {
  const message = JSON.stringify({ type: event, ...data, timestamp: Date.now() });
  predictionClients.forEach(client => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

console.log(`✅ WebSocket server running on port ${PORT}`);

// Initialize prediction manager
let predictionManager = null;

try {
  predictionManager = new PredictionManager(connection, authorityKeypair);

  // Wire up prediction events to broadcast
  predictionManager.on('round_started', (data) => broadcastPrediction('round_started', data));
  predictionManager.on('round_locked', (data) => broadcastPrediction('round_locked', data));
  predictionManager.on('round_settled', (data) => broadcastPrediction('round_settled', data));
  predictionManager.on('bet_placed', (data) => broadcastPrediction('bet_placed', data));
  predictionManager.on('timer_update', (data) => broadcastPrediction('timer_update', data));
  predictionManager.on('price_update', (data) => broadcastPrediction('price_update', data));

  predictionManager.initialize();
  console.log('✅ Prediction game manager started');
} catch (err) {
  console.error('Failed to initialize prediction manager:', err.message);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  if (predictionManager) predictionManager.shutdown();
  wss.close();
  process.exit(0);
});

console.log('================================');
console.log('🔮 Market Predict Backend Ready!');
