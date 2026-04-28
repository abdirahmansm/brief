export default function BriefLogo({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="3 2 18 20"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Brief logo"
    >
      <defs>
        <linearGradient id="briefLens" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0e8ff" />
          <stop offset="100%" stopColor="#b48cff" />
        </linearGradient>
        <linearGradient id="briefBars" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id="briefArrow" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>

      <circle cx="10" cy="10" r="7" fill="#120f1f" />
      <circle cx="10" cy="10" r="6.35" stroke="url(#briefLens)" strokeWidth="1.3" />

      <rect x="7" y="11.1" width="1.6" height="3.3" rx="0.45" fill="url(#briefBars)" />
      <rect x="9.2" y="9.8" width="1.6" height="4.6" rx="0.45" fill="url(#briefBars)" />
      <rect x="11.4" y="8.5" width="1.6" height="5.9" rx="0.45" fill="url(#briefBars)" />

      <path d="M7.4 9.2 10.2 8.2 12.5 6.6 14.6 6" stroke="url(#briefArrow)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m14.55 6.05-.65.1.23.67z" fill="url(#briefArrow)" />

      <path d="M14.9 14.9 19.1 19.1" stroke="#c4a4ff" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}
