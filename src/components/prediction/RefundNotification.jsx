import { useState, useEffect } from 'react';
import { usePrediction } from '../../context/PredictionContext';

export const RefundNotification = () => {
  const { cancelledRoundInfo, dismissCancelledPopup, claimRefund, pendingRefunds } = usePrediction();
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  // Auto-dismiss after 10 seconds if not interacted with
  useEffect(() => {
    if (cancelledRoundInfo && !isClaiming && !claimed) {
      const timer = setTimeout(() => {
        dismissCancelledPopup();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [cancelledRoundInfo, isClaiming, claimed, dismissCancelledPopup]);

  if (!cancelledRoundInfo) return null;

  const handleClaimRefund = async () => {
    setIsClaiming(true);
    try {
      await claimRefund(cancelledRoundInfo.round);
      setClaimed(true);
      // Auto-dismiss after successful claim
      setTimeout(() => {
        dismissCancelledPopup();
        setClaimed(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to claim refund:', err);
      alert('Failed to claim refund: ' + err.message);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={dismissCancelledPopup}
      />

      {/* Modal */}
      <div
        className="relative bg-gray-900 rounded-2xl p-6 max-w-sm w-full border border-yellow-500/50 shadow-xl shadow-yellow-500/10 animate-bounce-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-white text-center mb-2">
          Round Cancelled
        </h2>

        {/* Message */}
        <p className="text-gray-400 text-center text-sm mb-4">
          {cancelledRoundInfo.message || 'This round was cancelled due to technical issues. Your bet will be refunded.'}
        </p>

        {/* Refund Amount */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
          <p className="text-yellow-400 text-xs text-center uppercase tracking-wider mb-1">Refund Available</p>
          <p className="text-3xl font-bold text-yellow-400 text-center">
            {cancelledRoundInfo.amount?.toFixed(3)} <span className="text-lg">SOL</span>
          </p>
        </div>

        {claimed ? (
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-400 text-sm font-medium">Refund claimed successfully!</p>
          </div>
        ) : (
          <>
            {/* Claim Button */}
            <button
              onClick={handleClaimRefund}
              disabled={isClaiming}
              className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold rounded-xl hover:from-yellow-400 hover:to-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-3"
            >
              {isClaiming ? 'Claiming...' : 'Claim Refund'}
            </button>

            {/* Later Button */}
            <button
              onClick={dismissCancelledPopup}
              className="w-full py-2 text-gray-400 text-sm hover:text-white transition-colors"
            >
              Claim Later
            </button>
          </>
        )}

        {/* Auto-dismiss hint */}
        {!claimed && (
          <p className="text-gray-500 text-xs text-center mt-3">
            You can claim this refund anytime from your history
          </p>
        )}
      </div>
    </div>
  );
};
