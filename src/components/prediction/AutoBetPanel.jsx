import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { usePredictionAutoBet } from '../../hooks/usePredictionAutoBet';
import { PREDICTION_CONFIG } from '../../config/prediction';
import { RocketIcon, RektIcon } from './Icons';

export const AutoBetPanel = () => {
  const { publicKey } = useWallet();
  const {
    isEnabled,
    direction,
    betAmount,
    roundsRemaining,
    totalRounds,
    isUnlimited,
    isPlacing,
    error,
    lastResult,
    enableAutoBet,
    disableAutoBet,
    setDirection,
    setBetAmount,
    setTotalRounds,
    setIsUnlimited,
  } = usePredictionAutoBet();

  const [localBetAmount, setLocalBetAmount] = useState(betAmount.toString());
  const [localRounds, setLocalRounds] = useState(totalRounds.toString());

  if (!publicKey) {
    return (
      <div className="glass-card rounded-xl p-4 border border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🤖</span>
          <h3 className="text-white font-bold text-sm">Auto-Bet</h3>
        </div>
        <p className="text-gray-400 text-xs text-center py-4">
          Connect wallet to use Auto-Bet
        </p>
      </div>
    );
  }

  const handleEnable = () => {
    const amount = parseFloat(localBetAmount) || 0.1;
    const rounds = parseInt(localRounds) || 10;

    setBetAmount(amount);
    setTotalRounds(rounds);

    enableAutoBet({
      direction,
      betAmount: amount,
      rounds,
      unlimited: isUnlimited,
    });
  };

  const handleQuickSetup = (dir, amount, rounds) => {
    setDirection(dir);
    setLocalBetAmount(amount.toString());
    setBetAmount(amount);
    setLocalRounds(rounds.toString());
    setTotalRounds(rounds);
    setIsUnlimited(false);

    enableAutoBet({
      direction: dir,
      betAmount: amount,
      rounds,
      unlimited: false,
    });
  };

  return (
    <div className="glass-card rounded-xl p-4 border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h3 className="text-white font-bold text-sm">Auto-Bet</h3>
        </div>
        <div className="flex items-center gap-2">
          {isEnabled ? (
            <span className="flex items-center gap-1.5 text-[#39ff14] text-xs font-medium">
              <span className="w-1.5 h-1.5 bg-[#39ff14] rounded-full animate-pulse"></span>
              Active
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-gray-400 text-xs">
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
              Disabled
            </span>
          )}
        </div>
      </div>

      {/* Active Status Display */}
      {isEnabled && (
        <div className={`mb-3 p-3 rounded-lg border ${
          direction === 'up'
            ? 'bg-[#39ff14]/10 border-[#39ff14]/30'
            : 'bg-[#ff3131]/10 border-[#ff3131]/30'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {direction === 'up' ? <RocketIcon size={24} /> : <RektIcon size={24} />}
              <div>
                <p className={`font-bold text-sm ${direction === 'up' ? 'text-[#39ff14]' : 'text-[#ff3131]'}`}>
                  {direction === 'up' ? 'ROCKET' : 'REKT'}
                </p>
                <p className="text-gray-400 text-xs">{betAmount} SOL / round</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white font-mono font-bold">
                {typeof roundsRemaining === 'number' ? roundsRemaining : roundsRemaining}
              </p>
              <p className="text-gray-500 text-[10px]">rounds left</p>
            </div>
          </div>

          {isPlacing && (
            <div className="mt-2 flex items-center justify-center gap-2 text-amber-400 text-xs">
              <div className="animate-spin h-3 w-3 border-2 border-amber-400 border-t-transparent rounded-full"></div>
              Placing bet...
            </div>
          )}
        </div>
      )}

      {/* Configuration (when not active) */}
      {!isEnabled && (
        <>
          {/* Direction Selection */}
          <div className="mb-3">
            <label className="text-gray-400 text-xs block mb-2">Direction</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDirection('up')}
                className={`p-2.5 rounded-lg border transition-all flex items-center justify-center gap-2 ${
                  direction === 'up'
                    ? 'bg-[#39ff14]/20 border-[#39ff14]/50 text-[#39ff14]'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-[#39ff14]/30'
                }`}
              >
                <RocketIcon size={20} />
                <span className="font-bold text-xs">ROCKET</span>
              </button>
              <button
                onClick={() => setDirection('down')}
                className={`p-2.5 rounded-lg border transition-all flex items-center justify-center gap-2 ${
                  direction === 'down'
                    ? 'bg-[#ff3131]/20 border-[#ff3131]/50 text-[#ff3131]'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-[#ff3131]/30'
                }`}
              >
                <RektIcon size={20} />
                <span className="font-bold text-xs">REKT</span>
              </button>
            </div>
          </div>

          {/* Bet Amount */}
          <div className="mb-3">
            <label className="text-gray-400 text-xs block mb-1">Bet per Round (SOL)</label>
            <input
              type="number"
              value={localBetAmount}
              onChange={(e) => setLocalBetAmount(e.target.value)}
              min={PREDICTION_CONFIG.minBetSol}
              max={PREDICTION_CONFIG.maxBetSol}
              step="0.01"
              className="w-full bg-[#0a0e17] border border-white/10 focus:border-[#39ff14]/50 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none"
            />
          </div>

          {/* Number of Rounds */}
          <div className="mb-3">
            <label className="text-gray-400 text-xs block mb-1">Number of Rounds</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={localRounds}
                onChange={(e) => setLocalRounds(e.target.value)}
                min="1"
                max="100"
                disabled={isUnlimited}
                className="flex-1 bg-[#0a0e17] border border-white/10 focus:border-[#39ff14]/50 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none disabled:opacity-50"
              />
              <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={isUnlimited}
                  onChange={(e) => setIsUnlimited(e.target.checked)}
                  className="rounded border-gray-600 w-4 h-4 accent-[#39ff14]"
                />
                Unlimited
              </label>
            </div>
          </div>

          {/* Quick Setup */}
          <div className="mb-3">
            <p className="text-gray-500 text-[10px] mb-2 uppercase tracking-wider">Quick Setup</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleQuickSetup('up', 0.1, 10)}
                className="py-2 px-2 bg-[#39ff14]/10 hover:bg-[#39ff14]/20 border border-[#39ff14]/30 rounded-lg text-[#39ff14] text-xs font-medium transition-colors"
              >
                🚀 10 rounds @ 0.1
              </button>
              <button
                onClick={() => handleQuickSetup('down', 0.1, 10)}
                className="py-2 px-2 bg-[#ff3131]/10 hover:bg-[#ff3131]/20 border border-[#ff3131]/30 rounded-lg text-[#ff3131] text-xs font-medium transition-colors"
              >
                💀 10 rounds @ 0.1
              </button>
            </div>
          </div>

          {/* Total Cost Preview */}
          {localBetAmount && parseFloat(localBetAmount) > 0 && (
            <div className="mb-3 p-2 bg-white/5 rounded-lg">
              <p className="text-xs text-center">
                <span className="text-gray-400">Total: </span>
                <span className="text-[#39ff14] font-bold font-mono">
                  {isUnlimited
                    ? `${localBetAmount} SOL/round`
                    : `${(parseFloat(localBetAmount) * (parseInt(localRounds) || 1)).toFixed(2)} SOL`
                  }
                </span>
              </p>
              {!isUnlimited && (
                <p className="text-[10px] text-gray-500 text-center">
                  {parseInt(localRounds) || 1} rounds × {localBetAmount} SOL
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Enable/Disable Button */}
      {isEnabled ? (
        <button
          onClick={disableAutoBet}
          className="w-full py-3 bg-[#ff3131]/20 hover:bg-[#ff3131]/30 text-[#ff3131] font-bold text-sm rounded-lg border border-[#ff3131]/30 transition-colors"
        >
          Stop Auto-Bet
        </button>
      ) : (
        <button
          onClick={handleEnable}
          disabled={!localBetAmount || parseFloat(localBetAmount) <= 0}
          className={`w-full py-3 font-bold text-sm rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            direction === 'up'
              ? 'bg-gradient-to-r from-[#39ff14] to-[#32d912] text-black hover:shadow-lg hover:shadow-[#39ff14]/30'
              : 'bg-gradient-to-r from-[#ff3131] to-[#e62b2b] text-white hover:shadow-lg hover:shadow-[#ff3131]/30'
          }`}
        >
          Enable Auto-Bet
        </button>
      )}

      {/* Status Messages */}
      {lastResult && (
        <div className={`mt-2 p-2 rounded-lg text-xs text-center ${
          lastResult.type === 'success'
            ? 'bg-[#39ff14]/10 text-[#39ff14] border border-[#39ff14]/30'
            : 'bg-[#ff3131]/10 text-[#ff3131] border border-[#ff3131]/30'
        }`}>
          {lastResult.message}
        </div>
      )}

      {error && (
        <div className="mt-2 p-2 bg-[#ff3131]/10 border border-[#ff3131]/30 rounded-lg">
          <p className="text-[#ff3131] text-xs text-center">{error}</p>
        </div>
      )}

      {/* Info */}
      <p className="text-gray-600 text-[10px] mt-3 text-center">
        Auto-bet places your bet automatically each round
      </p>
    </div>
  );
};
