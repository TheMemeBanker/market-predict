import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { usePrediction } from '../../context/PredictionContext';
import { LAMPORTS_PER_SOL } from '../../config/prediction';
import { RocketIcon, RektIcon, TrophyIcon } from './Icons';

export const WinnerAnnouncement = () => {
  const { publicKey } = useWallet();
  const {
    roundStatus,
    winningDirection,
    currentRound,
    startPrice,
    settlePrice,
    userBet,
    upPool,
    downPool,
  } = usePrediction();

  const [showModal, setShowModal] = useState(false);
  const [displayData, setDisplayData] = useState(null);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Show modal when round settles
    if (roundStatus === 'settled' && winningDirection && startPrice && settlePrice) {
      const priceChange = ((settlePrice - startPrice) / startPrice) * 100;

      // Check if user won
      const userWon = userBet && userBet.direction === winningDirection;

      // Calculate user's winnings if they won
      let userWinnings = 0;
      if (userWon) {
        const winningPool = winningDirection === 'up' ? upPool : downPool;
        const losingPool = winningDirection === 'up' ? downPool : upPool;
        const userBetLamports = userBet.amount * LAMPORTS_PER_SOL;
        const feeMultiplier = 0.95; // 5% house fee
        const share = userBetLamports / winningPool;
        userWinnings = (losingPool * feeMultiplier * share) / LAMPORTS_PER_SOL;
      }

      // Only show modal if:
      // 1. User won (personalized win message)
      // 2. User is a spectator (no bet) - show generic result
      // DO NOT show if user lost (they bet but lost)
      const userLost = userBet && userBet.direction !== winningDirection;

      if (userLost) {
        // Don't show anything to losers
        return;
      }

      setDisplayData({
        winner: winningDirection,
        round: currentRound,
        startPrice,
        settlePrice,
        priceChange,
        userWon,
        userBet,
        userWinnings,
        isSpectator: !userBet,
      });
      setShowModal(true);
      setIsExiting(false);

      // Auto-dismiss after 6 seconds for winners, 4 seconds for spectators
      const timer = setTimeout(() => {
        handleClose();
      }, userWon ? 6000 : 4000);

      return () => clearTimeout(timer);
    }
  }, [roundStatus, winningDirection, currentRound, startPrice, settlePrice, userBet, upPool, downPool]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setShowModal(false);
      setIsExiting(false);
    }, 300);
  };

  if (!showModal || !displayData) return null;

  const isRocket = displayData.winner === 'up';

  // WINNER VIEW - Personalized for users who won
  if (displayData.userWon) {
    return (
      <div
        className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${
          isExiting ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      >
        {/* Golden/Green backdrop for winners */}
        <div className="absolute inset-0 bg-[#39ff14]/15 backdrop-blur-md" />

        {/* Confetti-like particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                backgroundColor: i % 2 === 0 ? '#39ff14' : '#ffd700',
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random()}s`,
              }}
            />
          ))}
        </div>

        {/* Winner Modal */}
        <div
          className={`relative transform transition-all duration-300 ${
            isExiting ? 'scale-90 opacity-0' : 'scale-100 opacity-100'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative rounded-3xl p-8 md:p-12 border-4 shadow-2xl bg-gradient-to-br from-[#0a1a0a] via-[#0a0e17] to-[#1a1a0a] border-[#39ff14]/80">
            {/* Intense glow effect for winners */}
            <div className="absolute inset-0 rounded-3xl animate-pulse-moon" style={{
              boxShadow: '0 0 80px rgba(57, 255, 20, 0.6), 0 0 120px rgba(255, 215, 0, 0.3), inset 0 0 60px rgba(57, 255, 20, 0.2)'
            }} />

            {/* Content */}
            <div className="relative text-center">
              {/* Trophy Icon */}
              <div className="mb-4 flex justify-center animate-bounce">
                <TrophyIcon size={100} />
              </div>

              {/* YOU WON text */}
              <h2 className="text-5xl md:text-7xl font-black uppercase tracking-wider mb-2 text-[#39ff14] drop-shadow-[0_0_40px_rgba(57,255,20,0.9)]">
                YOU WON!
              </h2>

              {/* Winnings amount - BIG and prominent */}
              <div className="my-6 py-4 px-6 rounded-2xl bg-[#39ff14]/20 border-2 border-[#39ff14]/50">
                <p className="text-gray-400 text-sm uppercase tracking-wider mb-2">Your Winnings</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-5xl md:text-6xl font-black font-mono text-white">
                    +{displayData.userWinnings.toFixed(4)}
                  </span>
                  <span className="text-3xl md:text-4xl font-black text-[#39ff14]">SOL</span>
                </div>
                <p className="text-gray-500 text-sm mt-2">
                  (Plus your {displayData.userBet.amount.toFixed(4)} SOL bet returned)
                </p>
              </div>

              {/* Sent to wallet confirmation */}
              <div className="flex items-center justify-center gap-2 text-[#39ff14] mb-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-bold uppercase tracking-wider">Sent to your wallet</span>
              </div>

              {/* Your bet info */}
              <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                <span>You bet</span>
                <span className="text-white font-mono font-bold">{displayData.userBet.amount} SOL</span>
                <span>on</span>
                <span className="flex items-center gap-1 text-[#39ff14] font-bold">
                  <RocketIcon size={16} />
                  ROCKET
                </span>
              </div>

              {/* Tap to dismiss */}
              <p className="mt-6 text-gray-600 text-xs uppercase tracking-wider">
                Tap anywhere to dismiss
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SPECTATOR VIEW - Generic result for people who didn't bet
  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className={`absolute inset-0 ${
        isRocket
          ? 'bg-[#39ff14]/10'
          : 'bg-[#ff3131]/10'
      } backdrop-blur-sm`} />

      {/* Modal */}
      <div
        className={`relative transform transition-all duration-300 ${
          isExiting ? 'scale-90 opacity-0' : 'scale-100 opacity-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`relative rounded-3xl p-8 md:p-12 border-4 shadow-2xl ${
          isRocket
            ? 'bg-gradient-to-br from-[#0a1a0a] to-[#0a0e17] border-[#39ff14]/60'
            : 'bg-gradient-to-br from-[#1a0a0a] to-[#0a0e17] border-[#ff3131]/60'
        }`}>
          {/* Glow effect */}
          <div className={`absolute inset-0 rounded-3xl ${
            isRocket ? 'animate-pulse-moon' : 'animate-pulse-doom'
          }`} style={{
            boxShadow: isRocket
              ? '0 0 60px rgba(57, 255, 20, 0.4), inset 0 0 60px rgba(57, 255, 20, 0.1)'
              : '0 0 60px rgba(255, 49, 49, 0.4), inset 0 0 60px rgba(255, 49, 49, 0.1)'
          }} />

          {/* Content */}
          <div className="relative text-center">
            {/* Round badge */}
            <div className={`inline-block px-4 py-1.5 rounded-full mb-4 ${
              isRocket ? 'bg-[#39ff14]/20' : 'bg-[#ff3131]/20'
            }`}>
              <span className="text-white/80 text-sm font-bold uppercase tracking-wider">
                Round {displayData.round} Complete
              </span>
            </div>

            {/* Icon with animation */}
            <div className={`mb-4 flex justify-center ${isRocket ? 'animate-bounce' : 'animate-shake'}`}>
              {isRocket ? <RocketIcon size={100} /> : <RektIcon size={100} />}
            </div>

            {/* Winner text */}
            <h2 className={`text-4xl md:text-5xl font-black uppercase tracking-wider mb-4 ${
              isRocket
                ? 'text-[#39ff14] drop-shadow-[0_0_30px_rgba(57,255,20,0.8)]'
                : 'text-[#ff3131] drop-shadow-[0_0_30px_rgba(255,49,49,0.8)]'
            }`}>
              {isRocket ? 'ROCKET' : 'REKT'} WINS!
            </h2>

            {/* Price change */}
            <div className={`text-2xl md:text-3xl font-mono font-black mb-4 ${
              isRocket ? 'text-[#39ff14]' : 'text-[#ff3131]'
            }`}>
              {displayData.priceChange >= 0 ? '+' : ''}{displayData.priceChange.toFixed(3)}%
            </div>

            {/* Price details */}
            <div className="flex items-center justify-center gap-4 md:gap-6 text-sm">
              <div className="text-center">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Start</p>
                <p className="text-white font-mono font-bold">${displayData.startPrice.toFixed(2)}</p>
              </div>
              <div className={`text-xl ${isRocket ? 'text-[#39ff14]' : 'text-[#ff3131]'}`}>
                {isRocket ? '↗' : '↘'}
              </div>
              <div className="text-center">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">End</p>
                <p className={`font-mono font-bold ${isRocket ? 'text-[#39ff14]' : 'text-[#ff3131]'}`}>
                  ${displayData.settlePrice.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Next round hint for spectators */}
            <p className="mt-6 text-gray-500 text-xs uppercase tracking-wider">
              Next round starting soon
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
