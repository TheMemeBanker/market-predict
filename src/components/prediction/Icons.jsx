// Custom SVG Icons for Prediction Game

// Rocket Icon (for UP/bullish)
export const RocketIcon = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Rocket body */}
    <path
      d="M24 4C24 4 12 16 12 28C12 32 14 36 18 38L24 44L30 38C34 36 36 32 36 28C36 16 24 4 24 4Z"
      fill="url(#rocketGradient)"
      stroke="#39ff14"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Window */}
    <circle cx="24" cy="22" r="5" fill="#0a0e17" stroke="#39ff14" strokeWidth="1.5" />
    <circle cx="24" cy="22" r="2.5" fill="#39ff14" opacity="0.6" />
    {/* Fins */}
    <path
      d="M12 28L6 34L10 36L14 32"
      fill="#39ff14"
      opacity="0.7"
    />
    <path
      d="M36 28L42 34L38 36L34 32"
      fill="#39ff14"
      opacity="0.7"
    />
    {/* Flame */}
    <path
      d="M20 38L24 48L28 38"
      fill="url(#flameGradient)"
    />
    <path
      d="M22 38L24 44L26 38"
      fill="#fff"
      opacity="0.8"
    />
    <defs>
      <linearGradient id="rocketGradient" x1="24" y1="4" x2="24" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#39ff14" />
        <stop offset="1" stopColor="#00cc00" />
      </linearGradient>
      <linearGradient id="flameGradient" x1="24" y1="38" x2="24" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ff6600" />
        <stop offset="0.5" stopColor="#ff3300" />
        <stop offset="1" stopColor="#ff0000" />
      </linearGradient>
    </defs>
  </svg>
);

// Rekt Icon (skull with X eyes for DOWN/bearish)
export const RektIcon = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Skull */}
    <path
      d="M24 4C14 4 8 12 8 22C8 30 12 34 12 34L12 40C12 42 14 44 16 44L20 44L20 40L28 40L28 44L32 44C34 44 36 42 36 40L36 34C36 34 40 30 40 22C40 12 34 4 24 4Z"
      fill="url(#skullGradient)"
      stroke="#ff3131"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Left X eye */}
    <path d="M14 18L20 24M20 18L14 24" stroke="#ff3131" strokeWidth="3" strokeLinecap="round" />
    {/* Right X eye */}
    <path d="M28 18L34 24M34 18L28 24" stroke="#ff3131" strokeWidth="3" strokeLinecap="round" />
    {/* Nose */}
    <path d="M24 26L22 30L26 30Z" fill="#ff3131" />
    {/* Teeth */}
    <rect x="16" y="34" width="4" height="6" rx="1" fill="#ff3131" opacity="0.8" />
    <rect x="22" y="34" width="4" height="6" rx="1" fill="#ff3131" opacity="0.8" />
    <rect x="28" y="34" width="4" height="6" rx="1" fill="#ff3131" opacity="0.8" />
    {/* Cracks */}
    <path d="M18 8L20 14L16 12" stroke="#ff3131" strokeWidth="1" opacity="0.5" />
    <path d="M32 10L28 16" stroke="#ff3131" strokeWidth="1" opacity="0.5" />
    <defs>
      <linearGradient id="skullGradient" x1="24" y1="4" x2="24" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#2a1a1a" />
        <stop offset="1" stopColor="#1a0a0a" />
      </linearGradient>
    </defs>
  </svg>
);

// Trophy Icon (for winning)
export const TrophyIcon = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M14 8H34V20C34 26 30 32 24 32C18 32 14 26 14 20V8Z"
      fill="url(#trophyGradient)"
      stroke="#ffd700"
      strokeWidth="2"
    />
    <path d="M14 12H8C8 12 6 12 6 16C6 20 10 22 14 20" stroke="#ffd700" strokeWidth="2" fill="#ffd700" opacity="0.3" />
    <path d="M34 12H40C40 12 42 12 42 16C42 20 38 22 34 20" stroke="#ffd700" strokeWidth="2" fill="#ffd700" opacity="0.3" />
    <rect x="20" y="32" width="8" height="6" fill="#ffd700" />
    <rect x="16" y="38" width="16" height="4" rx="1" fill="#ffd700" />
    <path d="M20 14L22 18L26 18L23 21L24 25L20 22L16 25L17 21L14 18L18 18Z" fill="#fff" opacity="0.6" />
    <defs>
      <linearGradient id="trophyGradient" x1="24" y1="8" x2="24" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ffd700" />
        <stop offset="1" stopColor="#ff9500" />
      </linearGradient>
    </defs>
  </svg>
);

// Loss Icon (broken coin)
export const LossIcon = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="24" cy="24" r="18" fill="#1a1a1a" stroke="#666" strokeWidth="2" />
    <path d="M16 16L32 32M32 16L16 32" stroke="#ff3131" strokeWidth="4" strokeLinecap="round" />
    <path d="M24 6L26 10L22 14L28 18L20 24" stroke="#ff3131" strokeWidth="1.5" opacity="0.6" />
  </svg>
);
