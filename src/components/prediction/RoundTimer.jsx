import { usePrediction } from '../../context/PredictionContext';

export const RoundTimer = () => {
  const { timeRemaining, roundStatus, currentRound } = usePrediction();

  const formatTime = (seconds) => {
    const totalSeconds = Math.floor(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isUrgent = roundStatus === 'active' && timeRemaining <= 10;
  const progress = roundStatus === 'active' ? (timeRemaining / 180) * 100 : 0; // 3 minute rounds

  const getStatusConfig = () => {
    switch (roundStatus) {
      case 'active':
        return {
          label: 'BETTING OPEN',
          emoji: '🎰',
          bgClass: 'bg-[#39ff14]/10 border-[#39ff14]/30',
          textClass: 'text-[#39ff14]',
          glowClass: 'animate-pulse-moon',
        };
      case 'locking':
        return {
          label: 'DETERMINING WINNER',
          emoji: '⚡',
          bgClass: 'bg-amber-500/10 border-amber-500/50',
          textClass: 'text-amber-400',
          glowClass: 'animate-pulse',
        };
      case 'locked':
        return {
          label: 'LOCKED',
          emoji: '🔒',
          bgClass: 'bg-purple-500/10 border-purple-500/30',
          textClass: 'text-purple-400',
          glowClass: '',
        };
      case 'settled':
        return {
          label: 'SETTLED',
          emoji: '✅',
          bgClass: 'bg-blue-500/10 border-blue-500/30',
          textClass: 'text-blue-400',
          glowClass: '',
        };
      default:
        return {
          label: 'WAITING',
          emoji: '⏳',
          bgClass: 'bg-gray-500/10 border-gray-500/30',
          textClass: 'text-gray-400',
          glowClass: '',
        };
    }
  };

  const status = getStatusConfig();

  return (
    <div className={`glass-card rounded-xl p-3 border-2 ${status.bgClass} ${status.glowClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-lg">{status.emoji}</span>
          <span className={`text-xs font-black uppercase tracking-wider ${status.textClass}`}>
            {status.label}
          </span>
        </div>
        <div className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
          <span className="text-gray-500 text-[10px] font-medium">Round </span>
          <span className="text-white font-mono text-xs font-bold">{currentRound || '--'}</span>
        </div>
      </div>

      {/* Timer */}
      <div className="text-center py-1">
        {roundStatus === 'locking' ? (
          <span className="text-3xl font-black uppercase tracking-wider text-amber-400 animate-pulse">
            0:00
          </span>
        ) : (
          <span className={`text-4xl font-black font-mono tracking-tighter ${
            isUrgent ? 'timer-urgent' : status.textClass
          }`}>
            {roundStatus === 'active' ? formatTime(timeRemaining) : '--:--'}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {roundStatus === 'active' && (
        <div className="relative h-2 bg-[#0a0e17] rounded-full overflow-hidden border border-white/10">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-linear ${
              isUrgent ? 'progress-doom' : 'progress-moon'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Urgent Warning */}
      {isUrgent && (
        <div className="mt-2 text-center">
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#ff3131]/20 border border-[#ff3131]/50 animate-urgent">
            <span className="text-sm">⚡</span>
            <span className="text-[#ff3131] text-xs font-black uppercase">LAST CHANCE!</span>
            <span className="text-sm">⚡</span>
          </div>
        </div>
      )}

      {/* Locking State - Determining Winner */}
      {roundStatus === 'locking' && (
        <div className="mt-2 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/50 animate-pulse">
            <div className="animate-spin h-4 w-4 border-2 border-amber-400 border-t-transparent rounded-full"></div>
            <span className="text-amber-400 text-sm font-black uppercase tracking-wider">Determining Winner...</span>
          </div>
        </div>
      )}

      {/* Locked State */}
      {roundStatus === 'locked' && (
        <div className="mt-2 text-center">
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30">
            <div className="animate-spin h-3 w-3 border-2 border-purple-400 border-t-transparent rounded-full"></div>
            <span className="text-purple-400 text-xs font-semibold">Finalizing...</span>
          </div>
        </div>
      )}
    </div>
  );
};
