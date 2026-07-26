import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import axios from 'axios';
import EventEmitter from 'events';

// Pyth Hermes API for price data
const PYTH_HERMES_API = 'https://hermes.pyth.network/api/latest_price_feeds';
const SOL_USD_FEED_ID = '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d';

export class PredictionManager extends EventEmitter {
  constructor(connection, authority) {
    super();
    this.connection = connection;
    this.authority = authority;
    this.currentRound = null;
    this.roundStatus = 'waiting'; // waiting, active, locked, settled
    this.timeRemaining = 0;
    this.roundDuration = 180; // 3 minutes
    this.lockBuffer = 10; // 10 seconds after lock to settle

    // Pool state
    this.upPool = 0;
    this.downPool = 0;
    this.upCount = 0;
    this.downCount = 0;
    this.bets = [];

    // Price state
    this.currentPrice = null;
    this.lockPrice = null;
    this.settlePrice = null;

    // Timer
    this.roundTimer = null;
    this.priceTimer = null;
  }

  async initialize() {
    console.log('[Prediction] Initializing manager...');

    // Start price polling
    this.startPricePolling();

    // Start first round after a short delay
    setTimeout(() => this.startRound(), 5000);

    console.log('[Prediction] Manager initialized');
  }

  async startPricePolling() {
    const fetchPrice = async () => {
      try {
        const response = await axios.get(`${PYTH_HERMES_API}?ids[]=${SOL_USD_FEED_ID}`);
        if (response.data && response.data[0]) {
          const priceData = response.data[0].price;
          this.currentPrice = parseFloat(priceData.price) * Math.pow(10, priceData.expo);
          this.emit('price_update', { price: this.currentPrice });
        }
      } catch (error) {
        console.error('[Prediction] Error fetching price:', error.message);
      }
    };

    // Fetch immediately
    await fetchPrice();

    // Then every second
    this.priceTimer = setInterval(fetchPrice, 1000);
  }

  async startRound() {
    console.log('[Prediction] Starting new round...');

    // Reset state
    this.currentRound = (this.currentRound || 0) + 1;
    this.roundStatus = 'active';
    this.timeRemaining = this.roundDuration;
    this.upPool = 0;
    this.downPool = 0;
    this.upCount = 0;
    this.downCount = 0;
    this.bets = [];
    this.lockPrice = null;
    this.settlePrice = null;

    // Emit round started
    this.emit('round_started', {
      round: this.currentRound,
      timeRemaining: this.timeRemaining,
    });

    // Start countdown
    this.roundTimer = setInterval(() => {
      this.timeRemaining--;

      this.emit('timer_update', { timeRemaining: this.timeRemaining });

      if (this.timeRemaining <= 0) {
        clearInterval(this.roundTimer);
        this.lockRound();
      }
    }, 1000);
  }

  async lockRound() {
    console.log('[Prediction] Locking round...');

    this.roundStatus = 'locked';
    this.lockPrice = this.currentPrice;

    this.emit('round_locked', {
      round: this.currentRound,
      lockPrice: this.lockPrice,
    });

    // Wait 10 seconds then settle
    setTimeout(() => this.settleRound(), this.lockBuffer * 1000);
  }

  async settleRound() {
    console.log('[Prediction] Settling round...');

    this.settlePrice = this.currentPrice;
    this.roundStatus = 'settled';

    // Determine winner
    const priceWentUp = this.settlePrice > this.lockPrice;
    const winningDirection = priceWentUp ? 'up' : 'down';

    console.log(`[Prediction] Lock: ${this.lockPrice}, Settle: ${this.settlePrice}, Winner: ${winningDirection}`);

    // Calculate payouts
    const winningPool = priceWentUp ? this.upPool : this.downPool;
    const losingPool = priceWentUp ? this.downPool : this.upPool;
    const houseFee = losingPool * 0.05;
    const totalPayouts = winningPool + losingPool - houseFee;

    // Process payouts for winning bets
    const payouts = [];
    for (const bet of this.bets) {
      if (bet.direction === winningDirection) {
        const share = bet.amount / winningPool;
        const payout = bet.amount + (losingPool - houseFee) * share;
        payouts.push({
          player: bet.player,
          payout,
          bet: bet.amount,
        });
      }
    }

    this.emit('round_settled', {
      round: this.currentRound,
      lockPrice: this.lockPrice,
      settlePrice: this.settlePrice,
      winningDirection,
      payouts,
      houseFee,
    });

    // Start next round after 5 seconds
    setTimeout(() => this.startRound(), 5000);
  }

  placeBet(player, direction, amount) {
    if (this.roundStatus !== 'active') {
      throw new Error('Round is not accepting bets');
    }

    // Check if player already bet
    const existingBet = this.bets.find(b => b.player === player);
    if (existingBet) {
      throw new Error('Already placed a bet this round');
    }

    // Add bet
    const bet = {
      player,
      direction,
      amount,
      timestamp: Date.now(),
    };
    this.bets.push(bet);

    // Update pools
    if (direction === 'up') {
      this.upPool += amount;
      this.upCount++;
    } else {
      this.downPool += amount;
      this.downCount++;
    }

    console.log(`[Prediction] Bet placed: ${player.slice(0, 8)}... - ${amount / 1e9} SOL on ${direction.toUpperCase()}`);

    this.emit('bet_placed', {
      player,
      direction,
      amount,
      upPool: this.upPool,
      downPool: this.downPool,
      upCount: this.upCount,
      downCount: this.downCount,
    });

    return bet;
  }

  getRoundState() {
    return {
      round: this.currentRound,
      status: this.roundStatus,
      timeRemaining: this.timeRemaining,
      upPool: this.upPool,
      downPool: this.downPool,
      upCount: this.upCount,
      downCount: this.downCount,
      lockPrice: this.lockPrice,
      settlePrice: this.settlePrice,
      currentPrice: this.currentPrice,
    };
  }

  shutdown() {
    if (this.roundTimer) clearInterval(this.roundTimer);
    if (this.priceTimer) clearInterval(this.priceTimer);
  }
}
