import { useMemo, useCallback, useState } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { PredictionGame } from './components/prediction/PredictionGame';
import { GeoProvider } from './context/GeoContext';
import { Disclaimer } from './components/Disclaimer';

// Solana RPC endpoint (keyless public; override via env)
const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://api.mainnet-beta.solana.com';

// Check if on mobile
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.innerWidth <= 768);
};

function App() {
  const endpoint = useMemo(() => RPC_URL, []);
  const [isOnMobile] = useState(isMobile);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  // Handle wallet errors (prevents stuck "Connecting" state on mobile)
  const onError = useCallback((error) => {
    console.error('[Wallet] Error:', error);
    // On mobile, if connection fails, clear localStorage to reset state
    if (isOnMobile && error?.name === 'WalletConnectionError') {
      localStorage.removeItem('walletName');
    }
  }, [isOnMobile]);

  // On mobile, don't auto-connect to prevent stuck "Connecting" state
  // Mobile users should manually tap to connect
  const shouldAutoConnect = useMemo(() => {
    // Only auto-connect on desktop, and only if previously connected
    if (isOnMobile) return false;
    return true;
  }, [isOnMobile]);

  return (
    <GeoProvider>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect={shouldAutoConnect} onError={onError}>
          <WalletModalProvider>
            <div className="min-h-screen pb-16">
              <PredictionGame />
              <Disclaimer />
            </div>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </GeoProvider>
  );
}

export default App;
