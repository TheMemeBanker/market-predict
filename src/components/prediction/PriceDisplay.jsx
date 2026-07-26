import { usePrediction } from '../../context/PredictionContext';
import { RocketIcon, RektIcon } from './Icons';

export const PriceDisplay = () => {
  const { currentPrice, startPrice, lockPrice, roundStatus } = usePrediction();

  const formatPrice = (price) => {
    if (!price) return '--';
    return `$${price.toFixed(2)}`;
  };

  // Calculate change from ROUND START PRICE (not previous tick)
  const calculateRoundChange = () => {
    if (!currentPrice || !startPrice) return 0;
    return ((currentPrice - startPrice) / startPrice) * 100;
  };

  const roundChange = calculateRoundChange();
  const isUp = roundChange >= 0;

  return (
    <div className="glass-card rounded-xl md:rounded-2xl p-3 md:p-6 border border-white/10">
      <div className="flex items-center justify-between gap-2 md:gap-4">
        {/* Current Price */}
        <div>
          <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
            <span className="relative flex h-2 w-2 md:h-3 md:w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#39ff14] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 md:h-3 md:w-3 bg-[#39ff14]"></span>
            </span>
            <p className="text-gray-400 text-[10px] md:text-sm uppercase tracking-widest font-bold">LIVE PRICE</p>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <span className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black font-mono price-display tracking-tight text-white">
              {formatPrice(currentPrice)}
            </span>
            {/* Round Change Indicator - shows change from round start */}
            {startPrice && roundStatus === 'active' && (
              <div className={`flex items-center gap-0.5 md:gap-1 px-1.5 md:px-3 py-0.5 md:py-1.5 rounded-md md:rounded-lg ${
                isUp ? 'bg-[#39ff14]/20 border border-[#39ff14]/40' : 'bg-[#ff3131]/20 border border-[#ff3131]/40'
              }`}>
                <span className={`text-sm md:text-xl font-black ${isUp ? 'text-[#39ff14]' : 'text-[#ff3131]'}`}>
                  {isUp ? '▲' : '▼'}
                </span>
                <span className={`text-xs md:text-lg font-bold font-mono ${isUp ? 'text-[#39ff14]' : 'text-[#ff3131]'}`}>
                  {isUp ? '+' : ''}{roundChange.toFixed(3)}%
                </span>
              </div>
            )}
          </div>
          {/* Show round start price reference */}
          {startPrice && roundStatus === 'active' && (
            <p className="text-gray-500 text-[10px] md:text-xs mt-1 font-mono">
              Round started at <span className="text-white font-semibold">{formatPrice(startPrice)}</span>
            </p>
          )}
        </div>

        {/* Lock Price (when locked) */}
        {roundStatus === 'locked' && lockPrice && (
          <div className="text-right flex-shrink-0">
            <p className="text-gray-500 text-[9px] md:text-xs uppercase tracking-widest mb-0.5 md:mb-1 font-semibold">LOCKED</p>
            <span className="text-lg md:text-3xl font-black font-mono text-white/70">
              {formatPrice(lockPrice)}
            </span>
          </div>
        )}
      </div>

      {/* Price comparison indicator - Compact on mobile */}
      {roundStatus === 'locked' && lockPrice && currentPrice && (
        <div className="mt-3 md:mt-6 pt-3 md:pt-6 border-t border-white/10">
          <div className="flex items-center justify-center">
            {currentPrice > lockPrice ? (
              <div className="flex items-center gap-2 md:gap-3 px-3 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl bg-[#39ff14]/10 border-2 border-[#39ff14]/40 animate-pulse-moon">
                <RocketIcon size={28} className="md:w-10 md:h-10" />
                <div>
                  <p className="text-[#39ff14] font-black text-sm md:text-xl uppercase tracking-wider">ROCKET WINNING</p>
                  <p className="text-[#39ff14]/80 font-mono text-xs md:text-lg">
                    +{((currentPrice - lockPrice) / lockPrice * 100).toFixed(3)}%
                  </p>
                </div>
              </div>
            ) : currentPrice < lockPrice ? (
              <div className="flex items-center gap-2 md:gap-3 px-3 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl bg-[#ff3131]/10 border-2 border-[#ff3131]/40 animate-pulse-doom">
                <RektIcon size={28} className="md:w-10 md:h-10" />
                <div>
                  <p className="text-[#ff3131] font-black text-sm md:text-xl uppercase tracking-wider">REKT WINNING</p>
                  <p className="text-[#ff3131]/80 font-mono text-xs md:text-lg">
                    -{((lockPrice - currentPrice) / lockPrice * 100).toFixed(3)}%
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 md:gap-3 px-3 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl bg-white/5 border-2 border-white/20">
                <svg className="w-7 h-7 md:w-10 md:h-10" viewBox="0 0 48 48" fill="none">
                  <path d="M8 24H40M24 8V40" stroke="#888" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="24" cy="24" r="18" stroke="#888" strokeWidth="2" fill="none" />
                </svg>
                <p className="text-gray-400 font-black text-sm md:text-xl uppercase tracking-wider">TIED</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
