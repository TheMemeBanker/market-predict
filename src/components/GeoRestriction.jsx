import { useGeo } from '../context/GeoContext';

export function GeoRestriction() {
  const { isRestricted, isLoading, country } = useGeo();

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Verifying location...</p>
        </div>
      </div>
    );
  }

  if (!isRestricted) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-4">
      <div className="bg-[#1a1a2e] border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-white mb-4">
          Region Restricted
        </h2>

        <p className="text-gray-400 mb-6 leading-relaxed">
          We're sorry, but Hot Prediction is not available in your region
          {country && ` (${country})`}. Due to regulatory requirements, users from
          the United States are not permitted to participate in wagering activities
          on this platform.
        </p>

        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <p className="text-red-400 text-sm">
            This restriction is in place to comply with applicable laws and regulations.
            Attempting to circumvent this restriction using VPNs or other methods is
            prohibited and may result in forfeiture of any winnings.
          </p>
        </div>

        <p className="text-gray-500 text-xs">
          If you believe this is an error, please contact support.
        </p>
      </div>
    </div>
  );
}
