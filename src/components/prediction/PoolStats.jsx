import { usePrediction } from '../../context/PredictionContext';
import { LAMPORTS_PER_SOL } from '../../config/prediction';
import { RocketIcon, RektIcon } from './Icons';

export const PoolStats = () => {
  const { upPool, downPool, upCount, downCount, odds } = usePrediction();

  const upPoolSol = upPool / LAMPORTS_PER_SOL;
  const downPoolSol = downPool / LAMPORTS_PER_SOL;
  const totalPool = upPoolSol + downPoolSol;
  const totalPlayers = upCount + downCount;

  const upPercent = totalPool > 0 ? (upPoolSol / totalPool) * 100 : 50;
  const downPercent = 100 - upPercent;

  return (
    <div className="glass-card rounded-xl p-2 md:p-3 border border-white/10">
      {/* Mobile: Stacked layout, Desktop: Horizontal */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        {/* Pool Distribution Bar */}
        <div className="flex-1 relative h-8 sm:h-10 rounded-lg overflow-hidden bg-[#0a0e17] border border-white/10">
          {/* ROCKET Pool */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#39ff14] to-[#00ff88] transition-all duration-500 flex items-center justify-start pl-1.5 sm:pl-2"
            style={{ width: `${Math.max(upPercent, 12)}%` }}
          >
            <div className="flex items-center gap-0.5 sm:gap-1">
              <RocketIcon size={14} className="sm:w-4 sm:h-4" />
              <span className="text-black font-black text-[10px] sm:text-xs">{upPercent.toFixed(0)}%</span>
            </div>
          </div>

          {/* REKT Pool */}
          <div
            className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-[#ff3131] to-[#ff6b6b] transition-all duration-500 flex items-center justify-end pr-1.5 sm:pr-2"
            style={{ width: `${Math.max(downPercent, 12)}%` }}
          >
            <div className="flex items-center gap-0.5 sm:gap-1">
              <span className="text-white font-black text-[10px] sm:text-xs">{downPercent.toFixed(0)}%</span>
              <RektIcon size={14} className="sm:w-4 sm:h-4" />
            </div>
          </div>
        </div>

        {/* Stats - Horizontal on mobile too but smaller */}
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 text-[10px] sm:text-xs">
          <div className="text-center">
            <div className="text-gray-500 text-[8px] sm:text-[10px] uppercase">Pool</div>
            <div className="text-white font-mono font-bold">{totalPool.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500 text-[8px] sm:text-[10px] uppercase">Players</div>
            <div className="text-white font-mono font-bold">{totalPlayers}</div>
          </div>
          <div className="flex items-center gap-2 sm:gap-0 sm:flex-col sm:border-l sm:border-white/10 sm:pl-3">
            <div className="flex items-center gap-1 sm:gap-0 sm:flex-col">
              <span className="text-[#39ff14] font-mono font-bold">{odds.up.toFixed(2)}x</span>
              <span className="text-gray-500 sm:hidden">/</span>
              <span className="text-[#ff3131] font-mono font-bold">{odds.down.toFixed(2)}x</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
