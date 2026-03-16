/**
 * Brief logo — 5 blue dots in a 2-column layout forming a stylized "B".
 * Left column: 3 dots stacked. Right column: 2 dots centered between them.
 * Dots use varying shades of blue for a soft gradient feel.
 *
 *   ●  ●
 *   ●  ●
 *   ●
 */
export default function BriefLogo({ size = 20 }: { size?: number }) {
  const dotR = size * 0.1;
  const colGap = size * 0.34;
  const rowGap = size * 0.24;

  // Left column — 3 dots evenly spaced
  const x1 = size / 2 - colGap / 2;
  // Right column
  const x2 = size / 2 + colGap / 2;

  // Left column y positions (3 rows)
  const yL1 = size / 2 - rowGap;
  const yL2 = size / 2;
  const yL3 = size / 2 + rowGap;

  // Right column y positions (centered between left rows)
  const yR1 = (yL1 + yL2) / 2;
  const yR2 = (yL2 + yL3) / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Brief logo"
    >
      {/* Left column — top, middle, bottom */}
      <circle cx={x1} cy={yL1} r={dotR} fill="#2F6BFF" />
      <circle cx={x1} cy={yL2} r={dotR} fill="#3A5BFF" />
      <circle cx={x1} cy={yL3} r={dotR} fill="#2F6BFF" />
      {/* Right column — between rows */}
      <circle cx={x2} cy={yR1} r={dotR} fill="#4A7CFF" />
      <circle cx={x2} cy={yR2} r={dotR} fill="#5A7FFF" />
    </svg>
  );
}
