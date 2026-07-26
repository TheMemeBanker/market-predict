// Prediction Game Configuration
import { PublicKey } from '@solana/web3.js';

// Pyth SOL/USD price feed addresses
export const PYTH_FEEDS = {
  mainnet: new PublicKey('H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG'), // SOL/USD on mainnet
  devnet: new PublicKey('J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix'),  // SOL/USD on devnet
};

// Pyth Hermes API for live price data
export const PYTH_HERMES_API = 'https://hermes.pyth.network/api/latest_price_feeds';
export const SOL_USD_FEED_ID = '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d';

// Game configuration
export const PREDICTION_CONFIG = {
  roundDurationSeconds: 180, // 3 minutes
  houseFeePercent: 5,
  minBetSol: 0.01,
  maxBetSol: 100,
};

// UI Colors
export const PREDICTION_COLORS = {
  up: {
    primary: '#22c55e',    // Green
    secondary: '#16a34a',
    bg: 'rgba(34, 197, 94, 0.1)',
    gradient: 'from-green-600 to-green-500',
  },
  down: {
    primary: '#ef4444',    // Red
    secondary: '#dc2626',
    bg: 'rgba(239, 68, 68, 0.1)',
    gradient: 'from-red-600 to-red-500',
  },
};

// Lamports per SOL
export const LAMPORTS_PER_SOL = 1_000_000_000;

// Format price from Pyth (with exponent)
export const formatPythPrice = (price, exponent = -8) => {
  const value = price * Math.pow(10, exponent);
  return value.toFixed(2);
};

// Calculate implied odds from pool sizes
export const calculateOdds = (upPool, downPool) => {
  const totalPool = upPool + downPool;
  if (totalPool === 0) return { up: 2.0, down: 2.0 };

  // Calculate multiplier (how much you get back per 1 SOL bet)
  // If you bet on UP: you get back (your_bet / up_pool) * total_pool * (1 - fee)
  const feeMultiplier = 1 - (PREDICTION_CONFIG.houseFeePercent / 100);

  const upOdds = upPool > 0
    ? (totalPool * feeMultiplier) / upPool
    : 10; // Default high odds if no bets

  const downOdds = downPool > 0
    ? (totalPool * feeMultiplier) / downPool
    : 10;

  return {
    up: Math.max(1.01, upOdds),
    down: Math.max(1.01, downOdds),
  };
};

// Calculate potential payout
export const calculatePayout = (betAmount, myPool, otherPool) => {
  const totalPool = myPool + otherPool + betAmount;
  const myNewPool = myPool + betAmount;
  const feeMultiplier = 1 - (PREDICTION_CONFIG.houseFeePercent / 100);

  const share = betAmount / myNewPool;
  const winnings = (otherPool * feeMultiplier) * share;

  return betAmount + winnings;
};
