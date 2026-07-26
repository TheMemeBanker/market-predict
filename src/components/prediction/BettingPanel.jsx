import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { usePrediction } from '../../context/PredictionContext';
import { useGeo } from '../../context/GeoContext';
import { PREDICTION_CONFIG, calculatePayout, LAMPORTS_PER_SOL } from '../../config/prediction';
import { RocketIcon, RektIcon } from './Icons';

export const BettingPanel = () => {
  const { publicKey } = useWallet();
  const {
    roundStatus,
    currentRound,
    displayRound,
    bettingRound,
    upPool,
    downPool,
    odds,
    userBet,
    placeBet,
    checkPendingRefunds,
    pendingRefunds,
  } = usePrediction();
  const { isRestricted, country } = useGeo();
  const [isCheckingRefunds, setIsCheckingRefunds] = useState(false);
  const [betAmount, setBetAmount] = useState('0.1');
  const [selectedDirection, setSelectedDirection] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showGeoWarning, setShowGeoWarning] = useState(false);

  // Can bet during active round if no bet placed yet
  const canBet = publicKey && roundStatus === 'active' && !userBet;

  const handleBet = async () => {
    if (!selectedDirection || !betAmount) return;

    // Check for US restriction
    if (isRestricted) {
      setShowGeoWarning(true);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await placeBet(selectedDirection, parseFloat(betAmount));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickAmounts = [0.05, 0.1, 0.25, 0.5, 1];

  // Calculate potential payouts
  const upPayout = calculatePayout(
    parseFloat(betAmount) * LAMPORTS_PER_SOL,
    upPool,
    downPool
  ) / LAMPORTS_PER_SOL;

  const downPayout = calculatePayout(
    parseFloat(betAmount) * LAMPORTS_PER_SOL,
    downPool,
    upPool
  ) / LAMPORTS_PER_SOL;

  return (
    <div className="glass-card rounded-xl p-3 border border-white/10">
      {/* Betting open notice - shows betting is for NEXT round */}
      {roundStatus === 'active' && !userBet && (
        <div className="mb-3 p-2 rounded-lg bg-[#39ff14]/10 border border-[#39ff14]/30 animate-slide-up">
          <div className="flex items-center gap-2">
            <span className="text-[#39ff14] text-lg">🎰</span>
            <div>
              <p className="text-[#39ff14] font-bold text-xs">BETTING FOR ROUND {bettingRound || (displayRound + 1)}</p>
              <p className="text-[#39ff14]/70 text-[10px]">Watching Round {displayRound || currentRound} • Bet for the next round!</p>
            </div>
          </div>
        </div>
      )}

      {/* User's Current Bet (for this round) */}
      {userBet && (
        <div className={`mb-3 p-2.5 rounded-lg border ${
          userBet.direction === 'up'
            ? 'bg-[#39ff14]/10 border-[#39ff14]/50'
            : 'bg-[#ff3131]/10 border-[#ff3131]/50'
        } animate-slide-up`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={userBet.direction === 'up' ? 'animate-bounce' : ''}>
                {userBet.direction === 'up' ? <RocketIcon size={28} /> : <RektIcon size={28} />}
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase">Your Bet</p>
                <span className={`text-lg font-black ${
                  userBet.direction === 'up' ? 'text-[#39ff14]' : 'text-[#ff3131]'
                }`}>
                  {userBet.direction === 'up' ? 'ROCKET' : 'REKT'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400">Amount</p>
              <span className="text-sm font-bold text-white font-mono">
                {userBet.amount.toFixed(3)} SOL
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ROCKET / REKT Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* ROCKET (UP) Button */}
        <button
          onClick={() => setSelectedDirection('up')}
          disabled={!canBet}
          className={`relative p-2.5 rounded-lg transition-all duration-200 ${
            selectedDirection === 'up'
              ? 'btn-moon selected'
              : 'bg-[#39ff14]/10 border border-[#39ff14]/30 hover:border-[#39ff14] hover:bg-[#39ff14]/20'
          } ${!canBet ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className="text-center flex flex-col items-center">
            <RocketIcon size={32} />
            <span className={`text-sm font-black tracking-wider block mt-1 ${
              selectedDirection === 'up' ? 'text-black' : 'text-[#39ff14]'
            }`}>
              ROCKET
            </span>
            <div className={`text-xs font-bold ${selectedDirection === 'up' ? 'text-black/70' : 'text-[#39ff14]'}`}>
              {odds.up.toFixed(2)}x
            </div>
          </div>
        </button>

        {/* REKT (DOWN) Button */}
        <button
          onClick={() => setSelectedDirection('down')}
          disabled={!canBet}
          className={`relative p-2.5 rounded-lg transition-all duration-200 ${
            selectedDirection === 'down'
              ? 'btn-doom selected'
              : 'bg-[#ff3131]/10 border border-[#ff3131]/30 hover:border-[#ff3131] hover:bg-[#ff3131]/20'
          } ${!canBet ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className="text-center flex flex-col items-center">
            <RektIcon size={32} />
            <span className={`text-sm font-black tracking-wider block mt-1 ${
              selectedDirection === 'down' ? 'text-white' : 'text-[#ff3131]'
            }`}>
              REKT
            </span>
            <div className={`text-xs font-bold ${selectedDirection === 'down' ? 'text-white/80' : 'text-[#ff3131]'}`}>
              {odds.down.toFixed(2)}x
            </div>
          </div>
        </button>
      </div>

      {/* Bet Amount */}
      <div className="mb-2">
        <label className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>Amount</span>
          <span className="text-[#39ff14] font-mono text-[10px]">SOL</span>
        </label>
        <input
          type="number"
          value={betAmount}
          onChange={(e) => setBetAmount(e.target.value)}
          min={PREDICTION_CONFIG.minBetSol}
          max={PREDICTION_CONFIG.maxBetSol}
          step="0.01"
          disabled={!canBet}
          className="w-full bg-[#0a0e17] border border-white/10 focus:border-[#39ff14]/50 rounded-lg px-3 py-2.5 text-white font-mono text-lg font-bold focus:outline-none disabled:opacity-40 transition-colors"
          inputMode="decimal"
        />
      </div>

      {/* Quick Amount Buttons */}
      <div className="flex gap-1.5 mb-3">
        {quickAmounts.map((amount) => (
          <button
            key={amount}
            onClick={() => setBetAmount(amount.toString())}
            disabled={!canBet}
            className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
              betAmount === amount.toString()
                ? 'bg-[#39ff14] text-black'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {amount}
          </button>
        ))}
      </div>

      {/* Place Bet Button */}
      <button
        onClick={handleBet}
        disabled={!canBet || !selectedDirection || isSubmitting}
        className={`w-full py-3 rounded-lg font-black text-sm uppercase tracking-wider transition-all ${
          selectedDirection === 'up'
            ? 'btn-moon'
            : selectedDirection === 'down'
            ? 'btn-doom'
            : 'bg-gradient-to-r from-gray-700 to-gray-600 text-gray-300'
        } disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none`}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Placing Bet...
          </span>
        ) : !publicKey ? (
          'Connect Wallet'
        ) : userBet ? (
          '✓ Bet Placed'
        ) : roundStatus !== 'active' ? (
          'Waiting for next round...'
        ) : !selectedDirection ? (
          'Select Direction'
        ) : (
          <span className="flex items-center justify-center gap-2">
            {selectedDirection === 'up' ? <RocketIcon size={18} /> : <RektIcon size={18} />}
            Place {betAmount} SOL Bet
          </span>
        )}
      </button>

      {/* Error Message */}
      {error && (
        <div className="mt-2 p-2 bg-[#ff3131]/20 border border-[#ff3131]/30 rounded-lg text-[#ff3131] text-xs animate-slide-up">
          {error}
        </div>
      )}

      {/* Info */}
      <p className="mt-2 text-center text-[10px] text-gray-600">
        {PREDICTION_CONFIG.houseFeePercent}% fee on winnings • Bets are final
      </p>

      {/* Check Refunds Button */}
      {publicKey && (
        <button
          onClick={async () => {
            setIsCheckingRefunds(true);
            try {
              const refunds = await checkPendingRefunds();
              if (refunds.length === 0) {
                alert('No pending refunds found');
              }
            } catch (err) {
              console.error(err);
            } finally {
              setIsCheckingRefunds(false);
            }
          }}
          disabled={isCheckingRefunds}
          className="w-full mt-2 py-2 rounded-lg text-xs text-yellow-400 hover:text-yellow-300 border border-yellow-500/30 hover:border-yellow-500/50 bg-yellow-500/10 hover:bg-yellow-500/20 transition-all disabled:opacity-50"
        >
          {isCheckingRefunds ? 'Checking...' : pendingRefunds.length > 0 ? `⚠️ ${pendingRefunds.length} Refund(s) Available` : '🔍 Check for Refunds'}
        </button>
      )}

      {/* Geo Restriction Warning Modal */}
      {showGeoWarning && (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4" onClick={() => setShowGeoWarning(false)}>
          <div className="bg-[#1a1a2e] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Region Restricted</h3>
            <p className="text-gray-400 text-sm mb-4">
              Wagering is not available in your region{country ? ` (${country})` : ''}. Due to regulatory requirements, users from the United States cannot place bets on this platform.
            </p>
            <button
              onClick={() => setShowGeoWarning(false)}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
