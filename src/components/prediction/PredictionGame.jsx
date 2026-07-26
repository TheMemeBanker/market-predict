import { PredictionProvider } from '../../context/PredictionContext';
import { PriceDisplay } from './PriceDisplay';
import { BettingPanel } from './BettingPanel';
import { AutoBetPanel } from './AutoBetPanel';
import { PoolStats } from './PoolStats';
import { RoundTimer } from './RoundTimer';
import { PriceChart } from './PriceChart';
import { RoundResult } from './RoundResult';
import { WinnerAnnouncement } from './WinnerAnnouncement';
import { RefundNotification } from './RefundNotification';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const PredictionGame = () => {
  return (
    <PredictionProvider>
      {/* Winner Announcement Modal */}
      <WinnerAnnouncement />

      {/* Refund Notification Modal for cancelled rounds */}
      <RefundNotification />

      <div className="min-h-screen bg-[#0a0e17] text-white relative overflow-x-hidden">
        {/* Animated background effects - reduced on mobile */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-[#39ff14]/5 rounded-full blur-[80px] md:blur-[120px]"></div>
          <div className="absolute bottom-0 right-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-[#ff3131]/5 rounded-full blur-[80px] md:blur-[120px]"></div>
        </div>

        {/* Header - Clean & Professional */}
        <header className="sticky top-0 z-50 bg-[#0a0e17]/95 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
            <div className="flex items-center justify-between h-14 lg:h-16">
              {/* Logo */}
              <a href="https://www.hotprediction.fun" className="flex items-center gap-2.5 lg:gap-3 group">
                <img
                  src="/marketpredict/Predictions.png"
                  alt="Hot Predictions"
                  className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl flex-shrink-0 object-cover shadow-lg"
                />
                <div className="flex flex-col">
                  <h1 className="text-base lg:text-xl font-bold tracking-tight text-white group-hover:text-[#39ff14] transition-colors leading-tight">
                    Hot Predictions
                  </h1>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider hidden sm:block">Market Predict</p>
                </div>
              </a>

              {/* Right side */}
              <div className="flex items-center gap-2 lg:gap-3">
                {/* SOL/USD Badge - Hidden on mobile */}
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 lg:px-3 lg:py-2 bg-[#111827] border border-[#39ff14]/20 rounded-lg">
                  <img
                    src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                    alt="SOL"
                    className="w-4 h-4 lg:w-5 lg:h-5 rounded-full"
                  />
                  <span className="text-white font-bold text-xs lg:text-sm">
                    <span className="text-[#39ff14]">SOL</span>
                    <span className="text-gray-500">/USD</span>
                  </span>
                </div>

                {/* Live Badge - Desktop */}
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-[#39ff14]/10 border border-[#39ff14]/30 rounded-lg">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#39ff14] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#39ff14]"></span>
                  </span>
                  <span className="text-[#39ff14] text-xs font-bold uppercase">Live</span>
                </div>

                {/* Community Link */}
                <a
                  href="https://x.com/i/communities/2012933569530708362"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all"
                  title="Join our Community"
                >
                  <svg className="w-4 h-4 lg:w-5 lg:h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>

                {/* Wallet Button */}
                <div className="wallet-btn-compact">
                  <WalletMultiButton />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Under Construction Banner */}
        <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border-b border-amber-500/30">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-2">
            <svg className="w-4 h-4 text-amber-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-amber-400 text-sm font-medium">Under Construction - Game may have bugs</span>
            <svg className="w-4 h-4 text-amber-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        {/* Main Content */}
        <main className="relative max-w-7xl mx-auto px-4 lg:px-6 py-4 lg:py-6">
          {/* Mobile: Compact Price Display */}
          <div className="mb-3 md:mb-6">
            <PriceDisplay />
          </div>

          {/* Mobile Layout: Chart first, then controls */}
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-3">

            {/* Chart - Shows FIRST on mobile */}
            <div className="lg:col-span-9 lg:order-2 order-1">
              <div className="h-[280px] sm:h-[350px] md:h-[450px] lg:h-[550px]">
                <PriceChart />
              </div>
              {/* Pool Stats - Below chart */}
              <div className="mt-3">
                <PoolStats />
              </div>
            </div>

            {/* Controls - Shows SECOND on mobile */}
            <div className="lg:col-span-3 lg:order-1 order-2 space-y-3">
              <RoundTimer />
              <BettingPanel />
              <AutoBetPanel />
              <RoundResult />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative border-t border-white/5 mt-6 lg:mt-8">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>Powered by Pyth Oracle</span>
            </div>
            <a href="https://www.hotprediction.fun" className="text-[#39ff14] hover:text-[#39ff14]/80 transition-colors font-medium">
              hotprediction.fun
            </a>
          </div>
        </footer>
      </div>
    </PredictionProvider>
  );
};
