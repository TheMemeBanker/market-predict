import { usePrediction } from '../../context/PredictionContext';
import { LAMPORTS_PER_SOL } from '../../config/prediction';
import { RocketIcon, RektIcon, TrophyIcon, LossIcon } from './Icons';

export const RoundResult = () => {
  const {
    roundStatus,
    lockPrice,
    settlePrice,
    upPool,
    downPool,
    userBet,
  } = usePrediction();

  if (roundStatus !== 'settled' || !lockPrice || !settlePrice) {
    return null;
  }

  const priceWentUp = settlePrice > lockPrice;
  const priceChange = ((settlePrice - lockPrice) / lockPrice) * 100;

  const winningDirection = priceWentUp ? 'up' : 'down';
  const userWon = userBet && userBet.direction === winningDirection;

  let userWinnings = 0;
  if (userWon) {
    const winningPool = priceWentUp ? upPool : downPool;
    const losingPool = priceWentUp ? downPool : upPool;
    const userBetLamports = userBet.amount * LAMPORTS_PER_SOL;
    const feeMultiplier = 0.95;
    const share = userBetLamports / winningPool;
    userWinnings = (losingPool * feeMultiplier * share) / LAMPORTS_PER_SOL;
  }

  return (
    <div className={`glass-card rounded-2xl p-8 border-2 animate-slide-up ${
      priceWentUp
        ? 'bg-[#39ff14]/10 border-[#39ff14]/50'
        : 'bg-[#ff3131]/10 border-[#ff3131]/50'
    }`}>
      <div className="text-center">
        {/* Result Banner */}
        <div className={`inline-block px-6 py-2 rounded-full mb-4 ${
          priceWentUp ? 'bg-[#39ff14]/20' : 'bg-[#ff3131]/20'
        }`}>
          <span className={`text-sm font-black uppercase tracking-widest ${
            priceWentUp ? 'text-[#39ff14]' : 'text-[#ff3131]'
          }`}>
            ROUND SETTLED
          </span>
        </div>

        {/* Result Icon */}
        <div className={`mb-4 flex justify-center ${priceWentUp ? 'animate-bounce' : ''}`}>
          {priceWentUp ? <RocketIcon size={80} /> : <RektIcon size={80} />}
        </div>

        {/* Result Text */}
        <h3 className={`text-4xl font-black mb-2 uppercase tracking-wider ${
          priceWentUp ? 'text-[#39ff14] animate-glow-moon' : 'text-[#ff3131] animate-glow-doom'
        }`}>
          {priceWentUp ? 'ROCKET WINS!' : 'REKT WINS!'}
        </h3>

        {/* Price Change */}
        <p className={`text-2xl font-mono font-bold ${
          priceWentUp ? 'text-[#39ff14]' : 'text-[#ff3131]'
        }`}>
          {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(4)}%
        </p>

        {/* Price Details */}
        <div className="flex justify-center gap-8 mt-6">
          <div className="text-center">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Lock Price</p>
            <p className="text-white font-mono font-bold text-lg">${lockPrice.toFixed(4)}</p>
          </div>
          <div className="w-px bg-white/10"></div>
          <div className="text-center">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Settle Price</p>
            <p className={`font-mono font-bold text-lg ${
              priceWentUp ? 'text-[#39ff14]' : 'text-[#ff3131]'
            }`}>
              ${settlePrice.toFixed(4)}
            </p>
          </div>
        </div>

        {/* User Result */}
        {userBet && (
          <div className={`mt-8 p-6 rounded-xl border-2 ${
            userWon
              ? 'bg-[#39ff14]/20 border-[#39ff14]/50 animate-win'
              : 'bg-[#ff3131]/20 border-[#ff3131]/50 animate-lose'
          }`}>
            {userWon ? (
              <>
                <div className="flex justify-center mb-3">
                  <TrophyIcon size={56} />
                </div>
                <p className="text-[#39ff14] font-black text-2xl uppercase tracking-wider mb-2">
                  YOU WON!
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-white font-mono font-black text-3xl">
                    +{userWinnings.toFixed(4)}
                  </span>
                  <span className="text-[#39ff14] font-bold text-xl">SOL</span>
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  (Plus your original {userBet.amount.toFixed(4)} SOL bet)
                </p>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-3">
                  <LossIcon size={56} />
                </div>
                <p className="text-[#ff3131] font-black text-2xl uppercase tracking-wider mb-2">
                  YOU GOT REKT!
                </p>
                <p className="text-gray-400 text-sm flex items-center justify-center gap-2">
                  You bet <span className="text-white font-mono">{userBet.amount.toFixed(4)} SOL</span> on
                  <span className={`flex items-center gap-1 ${userBet.direction === 'up' ? 'text-[#39ff14]' : 'text-[#ff3131]'}`}>
                    {userBet.direction === 'up' ? <RocketIcon size={16} /> : <RektIcon size={16} />}
                    {userBet.direction === 'up' ? 'ROCKET' : 'REKT'}
                  </span>
                </p>
              </>
            )}
          </div>
        )}

        {/* Next Round */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <div className="animate-spin h-5 w-5 border-2 border-[#39ff14] border-t-transparent rounded-full"></div>
          <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider">
            Next round starting soon...
          </p>
        </div>
      </div>
    </div>
  );
};
