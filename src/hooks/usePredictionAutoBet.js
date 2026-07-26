import { useState, useCallback, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { usePrediction } from '../context/PredictionContext';

/**
 * Hook for managing auto-bet functionality for the prediction game.
 * Since the prediction contract doesn't have escrow, this uses frontend automation
 * that auto-triggers bet placement when new rounds start.
 */
export const usePredictionAutoBet = () => {
  const { publicKey } = useWallet();
  const { roundStatus, currentRound, placeBet, userBet } = usePrediction();

  // Auto-bet configuration
  const [isEnabled, setIsEnabled] = useState(false);
  const [direction, setDirection] = useState('up'); // 'up' (rocket) or 'down' (rekt)
  const [betAmount, setBetAmount] = useState(0.1);
  const [roundsRemaining, setRoundsRemaining] = useState(0);
  const [totalRounds, setTotalRounds] = useState(10);
  const [isUnlimited, setIsUnlimited] = useState(false);

  // Track last round we bet on to prevent double-betting
  const lastBetRoundRef = useRef(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  // Load saved preferences from localStorage
  useEffect(() => {
    if (publicKey) {
      const saved = localStorage.getItem(`prediction_autobet_${publicKey.toBase58()}`);
      if (saved) {
        try {
          const config = JSON.parse(saved);
          setDirection(config.direction || 'up');
          setBetAmount(config.betAmount || 0.1);
          setTotalRounds(config.totalRounds || 10);
          setIsUnlimited(config.isUnlimited || false);
          // Don't restore isEnabled - user should manually enable each session
        } catch (e) {
          console.error('Failed to load auto-bet config:', e);
        }
      }
    }
  }, [publicKey]);

  // Save preferences to localStorage when they change
  useEffect(() => {
    if (publicKey) {
      localStorage.setItem(`prediction_autobet_${publicKey.toBase58()}`, JSON.stringify({
        direction,
        betAmount,
        totalRounds,
        isUnlimited,
      }));
    }
  }, [publicKey, direction, betAmount, totalRounds, isUnlimited]);

  // Auto-place bet when round becomes active
  useEffect(() => {
    const autoPlaceBet = async () => {
      // Only proceed if:
      // 1. Auto-bet is enabled
      // 2. Round is active
      // 3. We haven't already bet this round
      // 4. We have rounds remaining (or unlimited)
      // 5. Not already placing
      // 6. No existing bet for this round
      if (
        !isEnabled ||
        roundStatus !== 'active' ||
        lastBetRoundRef.current === currentRound ||
        (!isUnlimited && roundsRemaining <= 0) ||
        isPlacing ||
        userBet
      ) {
        return;
      }

      setIsPlacing(true);
      setError(null);

      try {
        console.log(`[AutoBet] Placing bet for Round ${currentRound}: ${betAmount} SOL on ${direction.toUpperCase()}`);

        await placeBet(direction, betAmount);

        lastBetRoundRef.current = currentRound;

        // Decrement rounds remaining if not unlimited
        if (!isUnlimited) {
          setRoundsRemaining(prev => {
            const newVal = prev - 1;
            if (newVal <= 0) {
              setIsEnabled(false);
              setLastResult({ message: 'Auto-bet completed! All rounds used.', type: 'success' });
            }
            return newVal;
          });
        }

        setLastResult({ message: `Bet placed for Round ${currentRound}`, type: 'success' });
      } catch (err) {
        console.error('[AutoBet] Failed to place bet:', err);
        setError(err.message);
        setLastResult({ message: err.message, type: 'error' });

        // If it's a critical error, disable auto-bet
        if (err.message.includes('insufficient') || err.message.includes('balance')) {
          setIsEnabled(false);
        }
      } finally {
        setIsPlacing(false);
      }
    };

    // Small delay to ensure round state is stable
    const timer = setTimeout(autoPlaceBet, 1000);
    return () => clearTimeout(timer);
  }, [isEnabled, roundStatus, currentRound, direction, betAmount, roundsRemaining, isUnlimited, isPlacing, userBet, placeBet]);

  // Enable auto-bet
  const enableAutoBet = useCallback((config = {}) => {
    const newDirection = config.direction || direction;
    const newAmount = config.betAmount || betAmount;
    const newRounds = config.rounds || totalRounds;
    const unlimited = config.unlimited ?? isUnlimited;

    setDirection(newDirection);
    setBetAmount(newAmount);
    setTotalRounds(newRounds);
    setIsUnlimited(unlimited);
    setRoundsRemaining(unlimited ? Infinity : newRounds);
    setIsEnabled(true);
    setError(null);
    lastBetRoundRef.current = null; // Reset so we can bet on current round if active

    console.log(`[AutoBet] Enabled: ${newAmount} SOL on ${newDirection.toUpperCase()} for ${unlimited ? 'unlimited' : newRounds} rounds`);
  }, [direction, betAmount, totalRounds, isUnlimited]);

  // Disable auto-bet
  const disableAutoBet = useCallback(() => {
    setIsEnabled(false);
    setRoundsRemaining(0);
    console.log('[AutoBet] Disabled');
  }, []);

  // Update configuration without enabling
  const updateConfig = useCallback((config) => {
    if (config.direction !== undefined) setDirection(config.direction);
    if (config.betAmount !== undefined) setBetAmount(config.betAmount);
    if (config.rounds !== undefined) setTotalRounds(config.rounds);
    if (config.unlimited !== undefined) setIsUnlimited(config.unlimited);
  }, []);

  return {
    // State
    isEnabled,
    direction,
    betAmount,
    roundsRemaining: isUnlimited ? '∞' : roundsRemaining,
    totalRounds,
    isUnlimited,
    isPlacing,
    error,
    lastResult,

    // Actions
    enableAutoBet,
    disableAutoBet,
    updateConfig,
    setDirection,
    setBetAmount,
    setTotalRounds,
    setIsUnlimited,
  };
};
