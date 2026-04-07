export type BunaaExpression = 'happy' | 'excited' | 'encouraging' | 'thinking';

interface BunaaAvatarProps {
  expression?: BunaaExpression;
  size?: number;
}

export default function BunaaAvatar({ expression = 'happy', size = 48 }: BunaaAvatarProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="بنّاء"
    >
      {/* Helmet */}
      <ellipse cx="24" cy="14" rx="20" ry="12" fill="#FFC107" />
      <rect x="4" y="12" width="40" height="6" rx="2" fill="#FFA000" />
      {/* Helmet shine */}
      <ellipse cx="16" cy="10" rx="6" ry="3" fill="#FFD54F" opacity="0.6" />

      {/* Face */}
      <circle cx="24" cy="28" r="16" fill="#FFCC80" />

      {/* Cheeks */}
      <circle cx="14" cy="32" r="3" fill="#FFAB91" opacity="0.4" />
      <circle cx="34" cy="32" r="3" fill="#FFAB91" opacity="0.4" />

      {expression === 'happy' && <HappyFace />}
      {expression === 'excited' && <ExcitedFace />}
      {expression === 'encouraging' && <EncouragingFace />}
      {expression === 'thinking' && <ThinkingFace />}
    </svg>
  );
}

function HappyFace() {
  return (
    <>
      {/* Happy eyes (arcs) */}
      <path d="M16 26 Q18 23 20 26" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M28 26 Q30 23 32 26" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Smile */}
      <path d="M18 33 Q24 38 30 33" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  );
}

function ExcitedFace() {
  return (
    <>
      {/* Wide shiny eyes */}
      <circle cx="18" cy="25" r="3" fill="#333" />
      <circle cx="30" cy="25" r="3" fill="#333" />
      <circle cx="19" cy="24" r="1" fill="#FFF" />
      <circle cx="31" cy="24" r="1" fill="#FFF" />
      {/* Open mouth (oval) */}
      <ellipse cx="24" cy="34" rx="5" ry="4" fill="#333" />
      <ellipse cx="24" cy="33" rx="3.5" ry="2" fill="#E57373" />
      {/* Star sparkle */}
      <g transform="translate(38, 12) scale(0.6)">
        <polygon points="5,0 6.5,3.5 10,3.5 7.5,6 8.5,10 5,7.5 1.5,10 2.5,6 0,3.5 3.5,3.5" fill="#FFD700" />
      </g>
    </>
  );
}

function EncouragingFace() {
  return (
    <>
      {/* Gentle eyes */}
      <circle cx="18" cy="25" r="2.5" fill="#333" />
      <circle cx="30" cy="25" r="2.5" fill="#333" />
      <circle cx="19" cy="24.5" r="0.8" fill="#FFF" />
      <circle cx="31" cy="24.5" r="0.8" fill="#FFF" />
      {/* Small gentle smile */}
      <path d="M20 33 Q24 36 28 33" stroke="#333" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* Thumbs up (simplified) */}
      <g transform="translate(36, 30)">
        <circle cx="0" cy="0" r="4" fill="#FFCC80" stroke="#E0A050" strokeWidth="0.5" />
        <rect x="-1" y="-6" width="2.5" height="5" rx="1" fill="#FFCC80" stroke="#E0A050" strokeWidth="0.5" />
      </g>
    </>
  );
}

function ThinkingFace() {
  return (
    <>
      {/* Eyes looking up */}
      <circle cx="18" cy="24" r="2.5" fill="#333" />
      <circle cx="30" cy="24" r="2.5" fill="#333" />
      <circle cx="18.5" cy="23" r="0.8" fill="#FFF" />
      <circle cx="30.5" cy="23" r="0.8" fill="#FFF" />
      {/* Small mouth */}
      <circle cx="24" cy="34" r="2" fill="#333" />
      {/* Thinking bubble */}
      <circle cx="38" cy="14" r="2" fill="#E0E0E0" />
      <circle cx="41" cy="10" r="3" fill="#E0E0E0" />
      <circle cx="44" cy="5" r="4" fill="#E0E0E0" />
    </>
  );
}
