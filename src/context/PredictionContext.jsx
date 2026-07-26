import { Buffer } from 'buffer';
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer;
}

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { PYTH_HERMES_API, SOL_USD_FEED_ID, PREDICTION_CONFIG, LAMPORTS_PER_SOL, calculateOdds } from '../config/prediction';
import PREDICTION_IDL from '../idl/prediction_game.json';

const PredictionContext = createContext(null);

// Program configuration
const PREDICTION_PROGRAM_ID = new PublicKey('GG4SHU9dJNRGrWfWXmtDtFsX2jpYEhKjHkZBdn5X8fzt');
const WS_URL = import.meta.env.VITE_WS_URL || 'wss://api.hotprediction.fun';

export const PredictionProvider = ({ children }) => {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();

  // Price state
  const [currentPrice, setCurrentPrice] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [priceChange, setPriceChange] = useState(0);

  // Round state - TWO ROUND SYSTEM
  // displayRound = the round being shown (countdown, settling)
  // bettingRound = the NEXT round that players bet on
  const [currentRound, setCurrentRound] = useState(1); // Legacy: alias for displayRound
  const [displayRound, setDisplayRound] = useState(1);
  const [displayRoundPda, setDisplayRoundPda] = useState(null);
  const [bettingRound, setBettingRound] = useState(2);
  const [bettingRoundPda, setBettingRoundPda] = useState(null);
  const [roundPda, setRoundPda] = useState(null); // Legacy: alias for bettingRoundPda
  const [roundStatus, setRoundStatus] = useState('waiting'); // waiting, active, locked, settled
  const [serverTimeRemaining, setServerTimeRemaining] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0); // Smooth interpolated time
  const [startPrice, setStartPrice] = useState(null);
  const lastServerUpdateRef = useRef(Date.now());
  const [lockPrice, setLockPrice] = useState(null);
  const [settlePrice, setSettlePrice] = useState(null);
  const [winningDirection, setWinningDirection] = useState(null);

  // Pool state (in lamports)
  const [upPool, setUpPool] = useState(0);
  const [downPool, setDownPool] = useState(0);
  const [upCount, setUpCount] = useState(0);
  const [downCount, setDownCount] = useState(0);

  // User state
  const [userBet, setUserBet] = useState(null); // { direction: 'up'|'down', amount: number }
  const [userHistory, setUserHistory] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [pendingClaims, setPendingClaims] = useState([]); // Rounds with unclaimed payouts
  const [pendingRefunds, setPendingRefunds] = useState([]); // Cancelled rounds with refunds available
  const [cancelledRoundInfo, setCancelledRoundInfo] = useState(null); // Info about just-cancelled round for popup

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  // Refs
  const wsRef = useRef(null);
  const priceIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Smooth countdown interpolation - updates every 50ms for smooth animation
  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    if (roundStatus === 'active' && serverTimeRemaining > 0) {
      lastServerUpdateRef.current = Date.now();
      setTimeRemaining(serverTimeRemaining);

      timerIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - lastServerUpdateRef.current) / 1000;
        const interpolated = Math.max(0, serverTimeRemaining - elapsed);
        setTimeRemaining(interpolated);
      }, 50); // Update every 50ms for smooth animation
    } else {
      setTimeRemaining(serverTimeRemaining);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [serverTimeRemaining, roundStatus]);

  // Calculate odds
  const odds = calculateOdds(upPool, downPool);

  // Find PDAs
  const getConfigPda = useCallback(() => {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('prediction-config')],
      PREDICTION_PROGRAM_ID
    );
    return pda;
  }, []);

  const getRoundPda = useCallback((roundId) => {
    const roundIdBn = new BN(roundId);
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('prediction-round'), roundIdBn.toArrayLike(Buffer, 'le', 8)],
      PREDICTION_PROGRAM_ID
    );
    return pda;
  }, []);

  const getEntryPda = useCallback((roundId, player) => {
    const roundIdBn = new BN(roundId);
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('prediction-entry'), roundIdBn.toArrayLike(Buffer, 'le', 8), player.toBuffer()],
      PREDICTION_PROGRAM_ID
    );
    return pda;
  }, []);

  // Fetch live price from Pyth Hermes
  const fetchPrice = useCallback(async () => {
    try {
      const response = await fetch(`${PYTH_HERMES_API}?ids[]=${SOL_USD_FEED_ID}`);
      const data = await response.json();

      if (data && data[0]) {
        const priceData = data[0].price;
        const price = parseFloat(priceData.price) * Math.pow(10, priceData.expo);

        setCurrentPrice(prev => {
          if (prev) {
            setPriceChange(((price - prev) / prev) * 100);
          }
          return price;
        });

        setPriceHistory(prev => {
          const newHistory = [...prev, { price, timestamp: Date.now() }];
          return newHistory.slice(-180);
        });

        return price;
      }
    } catch (error) {
      console.error('Error fetching price:', error);
    }
    return null;
  }, []);

  // Start price polling
  useEffect(() => {
    fetchPrice();
    priceIntervalRef.current = setInterval(fetchPrice, 1000);

    return () => {
      if (priceIntervalRef.current) {
        clearInterval(priceIntervalRef.current);
      }
    };
  }, [fetchPrice]);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    console.log('[Prediction] Connecting to WebSocket...');
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[Prediction] WebSocket connected');
      setIsConnected(true);
      setError(null);

      // Subscribe to prediction game
      ws.send(JSON.stringify({ type: 'subscribe', game: 'prediction' }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (err) {
        console.error('[Prediction] Failed to parse message:', err);
      }
    };

    ws.onclose = () => {
      console.log('[Prediction] WebSocket disconnected');
      setIsConnected(false);

      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 3000);
    };

    ws.onerror = (err) => {
      console.error('[Prediction] WebSocket error:', err);
      setError('Connection error');
    };
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback((message) => {
    switch (message.type) {
      case 'round_state':
        // Initial state when connecting
        setCurrentRound(message.round || 1);
        setRoundPda(message.roundPda);
        setRoundStatus(message.status || 'waiting');
        setServerTimeRemaining(message.timeRemaining || 0);
        setUpPool(message.upPool || 0);
        setDownPool(message.downPool || 0);
        setUpCount(message.upCount || 0);
        setDownCount(message.downCount || 0);
        setLockPrice(message.lockPrice);
        setSettlePrice(message.settlePrice);
        // Set start price for reconnecting clients
        if (message.startPrice) {
          setStartPrice(message.startPrice);
        }
        break;

      case 'round_started':
        // TWO ROUND SYSTEM:
        // displayRound = what users watch (countdown)
        // bettingRound = what users bet on (NEXT round)
        const dispRound = message.displayRound || message.round;
        const betRound = message.bettingRound || (dispRound + 1);
        console.log(`[Prediction] Display Round ${dispRound} started, Betting on Round ${betRound}`);

        setDisplayRound(dispRound);
        setDisplayRoundPda(message.displayRoundPda || message.roundPda);
        setBettingRound(betRound);
        setBettingRoundPda(message.bettingRoundPda);

        // Legacy compatibility
        setCurrentRound(dispRound);
        setRoundPda(message.bettingRoundPda || message.roundPda); // Bets go to betting round

        setRoundStatus('active');
        setServerTimeRemaining(message.timeRemaining);

        // Pool data is for the DISPLAY round (what users see)
        // These are from bets placed in the PREVIOUS cycle when this was the betting round
        setUpPool(message.upPool || 0);
        setDownPool(message.downPool || 0);
        setUpCount(message.upCount || 0);
        setDownCount(message.downCount || 0);

        setLockPrice(null);
        setSettlePrice(null);
        setWinningDirection(null);
        setUserBet(null);
        setLastResult(null);
        setStartPrice(message.startPrice || currentPrice);
        break;

      case 'betting_round_ready':
        // New betting round is ready
        console.log(`[Prediction] Betting round ${message.bettingRound} ready`);
        setBettingRound(message.bettingRound);
        setBettingRoundPda(message.bettingRoundPda);
        setRoundPda(message.bettingRoundPda); // Legacy
        break;

      case 'pending_bets_ready':
        // Server signals that a new round has started and pending bets can be placed
        console.log(`[Prediction] Pending bets ready for Round ${message.round}`);
        break;

      case 'round_locking':
        // Immediate feedback when timer hits 0 - determining winner
        console.log(`[Prediction] Round ${message.round} locking - determining winner...`);
        setRoundStatus('locking');
        break;

      case 'round_locked':
        console.log(`[Prediction] Round ${message.round} locked at ${message.lockPrice}`);
        setRoundStatus('locked');
        setLockPrice(message.lockPrice);
        break;

      case 'round_settled':
        console.log(`[Prediction] Round ${message.round} settled - Winner: ${message.winningDirection}, Cancelled: ${message.cancelled}`);
        setRoundStatus('settled');
        setSettlePrice(message.settlePrice);
        setWinningDirection(message.winningDirection);

        // Handle cancelled rounds (refunds available)
        if (message.cancelled && userBet) {
          console.log(`[Prediction] Round ${message.round} was cancelled - refund available`);
          const refundAmount = userBet.amount * LAMPORTS_PER_SOL;

          // Show popup for cancelled round
          setCancelledRoundInfo({
            round: currentRound,
            amount: userBet.amount,
            message: message.message || 'Round cancelled - your bet will be refunded',
          });

          // Track pending refund
          setPendingRefunds(prev => [...prev, { round: currentRound, amount: refundAmount }]);

          // Add to history as cancelled
          setUserHistory(prev => [{
            round: currentRound,
            direction: userBet.direction,
            amount: userBet.amount,
            cancelled: true,
            refundable: true,
            timestamp: Date.now(),
          }, ...prev.slice(0, 9)]);

          setLastResult({
            cancelled: true,
            refundAmount: userBet.amount,
          });
        }
        // Calculate user result if they bet (normal settlement)
        else if (userBet && message.winningDirection) {
          const won = userBet.direction === message.winningDirection;
          let payout = 0;

          if (won) {
            const winningPool = message.winningDirection === 'up' ? upPool : downPool;
            const losingPool = message.winningDirection === 'up' ? downPool : upPool;
            const userBetLamports = userBet.amount * LAMPORTS_PER_SOL;
            const houseFee = losingPool * (PREDICTION_CONFIG.houseFeePercent / 100);
            const share = userBetLamports / winningPool;
            payout = userBetLamports + share * (losingPool - houseFee);
          }

          setLastResult({
            won,
            payout: payout / LAMPORTS_PER_SOL,
            direction: message.winningDirection,
            userDirection: userBet.direction,
          });

          // Add to history
          setUserHistory(prev => [{
            round: currentRound,
            direction: userBet.direction,
            amount: userBet.amount,
            won,
            payout: payout / LAMPORTS_PER_SOL,
            timestamp: Date.now(),
          }, ...prev.slice(0, 9)]);

          // Track pending claim if won
          if (won) {
            setPendingClaims(prev => [...prev, { round: currentRound, payout }]);
          }
        }
        break;

      case 'timer_update':
        setServerTimeRemaining(message.timeRemaining);
        break;

      case 'price_update':
        // Backend sends its own price updates, but we prefer our own polling
        // setCurrentPrice(message.price);
        break;

      case 'pools_updated':
        setUpPool(message.upPool);
        setDownPool(message.downPool);
        setUpCount(message.upCount);
        setDownCount(message.downCount);
        break;

      default:
        // Unknown message type
        break;
    }
  }, [currentPrice, userBet, upPool, downPool, currentRound]);

  // Connect on mount
  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebSocket]);

  // Place a bet on-chain for the BETTING round (next round, not the displayed one)
  // TWO ROUND SYSTEM: Users bet on bettingRound while watching displayRound
  const placeBet = useCallback(async (direction, amount) => {
    if (!publicKey) {
      throw new Error('Connect your wallet first');
    }

    if (roundStatus !== 'active') {
      throw new Error('Betting is only open during active rounds');
    }

    if (userBet) {
      throw new Error('Already placed a bet for the next round');
    }

    if (amount < PREDICTION_CONFIG.minBetSol) {
      throw new Error(`Minimum bet is ${PREDICTION_CONFIG.minBetSol} SOL`);
    }

    // Use betting round PDA (the NEXT round)
    // Calculate locally if server hasn't provided it yet
    const targetRound = bettingRound || (displayRound + 1);
    const targetRoundPda = bettingRoundPda || roundPda || getRoundPda(targetRound).toBase58();

    if (!targetRoundPda) {
      throw new Error('Betting round not ready yet');
    }

    try {
      // Create Anchor provider using wallet adapter
      const wallet = {
        publicKey,
        signTransaction,
        signAllTransactions,
      };
      const provider = new AnchorProvider(connection, wallet, {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
      });

      // Create program instance
      const program = new Program(PREDICTION_IDL, provider);

      // Get PDAs - use BETTING round, not display round
      const configPda = getConfigPda();
      const roundPdaPubkey = new PublicKey(targetRoundPda);
      const entryPda = getEntryPda(targetRound, publicKey);

      // Build direction enum
      const directionArg = direction === 'up' ? { up: {} } : { down: {} };
      const amountLamports = new BN(amount * LAMPORTS_PER_SOL);

      console.log(`[Prediction] Placing bet on BETTING Round ${targetRound}: ${amount} SOL on ${direction.toUpperCase()} (watching Round ${displayRound})`);

      // Send transaction - user signs and pays NOW
      const tx = await program.methods
        .placePrediction(directionArg, amountLamports)
        .accounts({
          config: configPda,
          round: roundPdaPubkey,
          entry: entryPda,
          player: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log(`[Prediction] Bet placed for Round ${targetRound}! TX: ${tx}`);

      // Update local state - mark that user has bet for the NEXT round
      // Note: We do NOT update pool display because this bet is for the BETTING round
      // Pool display is always for the DISPLAY round (what users are watching)
      setUserBet({ direction, amount, forRound: targetRound });

      return tx;
    } catch (err) {
      console.error('[Prediction] Failed to place bet:', err);
      throw new Error(err.message || 'Failed to place bet');
    }
  }, [publicKey, connection, signTransaction, signAllTransactions, roundStatus, userBet, roundPda, bettingRoundPda, bettingRound, displayRound, getConfigPda, getEntryPda]);

  // Claim payout for a winning bet
  const claimPayout = useCallback(async (round) => {
    if (!publicKey) {
      throw new Error('Connect your wallet first');
    }

    try {
      const wallet = {
        publicKey,
        signTransaction,
        signAllTransactions,
      };
      const provider = new AnchorProvider(connection, wallet, {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
      });

      const program = new Program(PREDICTION_IDL, provider);

      const roundPdaPubkey = getRoundPda(round);
      const entryPda = getEntryPda(round, publicKey);

      const tx = await program.methods
        .claimPayout()
        .accounts({
          round: roundPdaPubkey,
          entry: entryPda,
          player: publicKey,
        })
        .rpc();

      console.log(`[Prediction] Payout claimed! TX: ${tx}`);

      // Remove from pending claims
      setPendingClaims(prev => prev.filter(c => c.round !== round));

      return tx;
    } catch (err) {
      console.error('[Prediction] Failed to claim payout:', err);
      throw new Error(err.message || 'Failed to claim payout');
    }
  }, [publicKey, connection, signTransaction, signAllTransactions, getRoundPda, getEntryPda]);

  // Claim refund for a cancelled round
  const claimRefund = useCallback(async (round) => {
    if (!publicKey) {
      throw new Error('Connect your wallet first');
    }

    try {
      const wallet = {
        publicKey,
        signTransaction,
        signAllTransactions,
      };
      const provider = new AnchorProvider(connection, wallet, {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
      });

      const program = new Program(PREDICTION_IDL, provider);

      const roundPdaPubkey = getRoundPda(round);
      const entryPda = getEntryPda(round, publicKey);

      const tx = await program.methods
        .claimRefund()
        .accounts({
          round: roundPdaPubkey,
          entry: entryPda,
          player: publicKey,
        })
        .rpc();

      console.log(`[Prediction] Refund claimed! TX: ${tx}`);

      // Remove from pending refunds
      setPendingRefunds(prev => prev.filter(r => r.round !== round));

      return tx;
    } catch (err) {
      console.error('[Prediction] Failed to claim refund:', err);
      throw new Error(err.message || 'Failed to claim refund');
    }
  }, [publicKey, connection, signTransaction, signAllTransactions, getRoundPda, getEntryPda]);

  // Dismiss cancelled round popup
  const dismissCancelledPopup = useCallback(() => {
    setCancelledRoundInfo(null);
  }, []);

  // Check for pending refunds from cancelled rounds
  const checkPendingRefunds = useCallback(async () => {
    if (!publicKey) {
      console.log('[Prediction] No wallet connected, cannot check refunds');
      return [];
    }

    console.log('[Prediction] Scanning for unclaimed refunds...');
    const found = [];

    // Scan recent rounds (last 50) for cancelled rounds with unclaimed entries
    for (let roundId = Math.max(1, currentRound - 50); roundId <= currentRound; roundId++) {
      try {
        const roundPda = getRoundPda(roundId);
        const entryPda = getEntryPda(roundId, publicKey);

        // Check if entry exists
        const entryAccount = await connection.getAccountInfo(entryPda);
        if (!entryAccount) continue;

        // Parse entry data
        const entryData = entryAccount.data;
        const claimed = entryData[65] === 1;
        if (claimed) continue;

        // Check round status
        const roundAccount = await connection.getAccountInfo(roundPda);
        if (!roundAccount) continue;

        const roundData = roundAccount.data;
        const status = roundData[80]; // Status byte at offset 80

        // Status 3 = Cancelled
        if (status === 3) {
          const betAmountBytes = entryData.slice(49, 57);
          const betAmount = Number(BigInt(betAmountBytes[0]) + (BigInt(betAmountBytes[1]) << 8n) + (BigInt(betAmountBytes[2]) << 16n) + (BigInt(betAmountBytes[3]) << 24n) + (BigInt(betAmountBytes[4]) << 32n) + (BigInt(betAmountBytes[5]) << 40n) + (BigInt(betAmountBytes[6]) << 48n) + (BigInt(betAmountBytes[7]) << 56n));

          found.push({
            round: roundId,
            amount: betAmount / 1e9,
            entryPda: entryPda.toBase58(),
          });
          console.log(`[Prediction] Found unclaimed refund: Round ${roundId}, ${(betAmount / 1e9).toFixed(3)} SOL`);
        }
      } catch (err) {
        // Skip errors (account doesn't exist, etc)
      }
    }

    setPendingRefunds(found);
    console.log(`[Prediction] Found ${found.length} pending refunds`);

    // Show popup for first one if any
    if (found.length > 0) {
      setCancelledRoundInfo({
        round: found[0].round,
        amount: found[0].amount,
        message: `You have an unclaimed refund from Round ${found[0].round}`,
      });
    }

    return found;
  }, [publicKey, connection, currentRound, getRoundPda, getEntryPda]);

  const value = {
    // Price
    currentPrice,
    priceHistory,
    priceChange,

    // Round - TWO ROUND SYSTEM
    currentRound, // Legacy alias for displayRound
    displayRound, // The round being shown (countdown)
    displayRoundPda,
    bettingRound, // The round users bet on (NEXT round)
    bettingRoundPda,
    roundPda, // Legacy alias for bettingRoundPda
    roundStatus,
    timeRemaining,
    startPrice,
    lockPrice,
    settlePrice,
    winningDirection,

    // Pools
    upPool,
    downPool,
    upCount,
    downCount,
    odds,

    // User
    userBet,
    userHistory,
    lastResult,
    pendingClaims,
    pendingRefunds,
    cancelledRoundInfo,

    // Connection
    isConnected,
    error,
    isDemoMode: false,

    // Actions
    placeBet,
    claimPayout,
    claimRefund,
    dismissCancelledPopup,
    checkPendingRefunds,
  };

  return (
    <PredictionContext.Provider value={value}>
      {children}
    </PredictionContext.Provider>
  );
};

export const usePrediction = () => {
  const context = useContext(PredictionContext);
  if (!context) {
    throw new Error('usePrediction must be used within a PredictionProvider');
  }
  return context;
};
