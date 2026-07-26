import { useState } from 'react';

export function Disclaimer() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a14]/95 backdrop-blur-sm border-t border-white/10 z-50">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-yellow-500 text-xs font-semibold uppercase tracking-wider">
                Legal Disclaimer
              </span>
            </div>

            {!isExpanded ? (
              <p className="text-gray-400 text-xs leading-relaxed">
                Hot Prediction is not available to residents of the United States or any jurisdiction
                where online wagering is prohibited.{' '}
                <button
                  onClick={() => setIsExpanded(true)}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Read more
                </button>
              </p>
            ) : (
              <div className="text-gray-400 text-xs leading-relaxed space-y-2">
                <p>
                  <strong className="text-white">Eligibility:</strong> Hot Prediction is not available to
                  residents of the United States or any jurisdiction where online wagering is prohibited
                  by law. By using this platform, you confirm that you are of legal age and located in a
                  jurisdiction where participation is permitted.
                </p>
                <p>
                  <strong className="text-white">Risk Warning:</strong> Wagering involves significant risk.
                  You may lose some or all of your funds. Only wager what you can afford to lose. Past
                  performance is not indicative of future results.
                </p>
                <p>
                  <strong className="text-white">No Guarantee:</strong> This platform is provided "as is"
                  without warranties of any kind. We are not responsible for any losses incurred through
                  the use of this platform.
                </p>
                <p>
                  <strong className="text-white">Responsible Gaming:</strong> If you or someone you know has
                  a gambling problem, please seek help at{' '}
                  <a href="https://www.ncpgambling.org" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                    ncpgambling.org
                  </a>
                </p>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Show less
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-white transition-colors p-1"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
