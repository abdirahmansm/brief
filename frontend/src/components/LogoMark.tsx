interface LogoMarkProps {
  className?: string;
}

export default function LogoMark({ className = "" }: LogoMarkProps) {
  return (
    <span
      className={`flex h-8 w-8 items-center justify-center rounded-xl bg-[linear-gradient(135deg,oklch(0.55_0.24_262),oklch(0.50_0.22_262))] text-sm font-bold text-[var(--accent-foreground)] shadow-[0_0_20px_rgba(139,92,246,0.35)] ${className}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
        <path d="M10 4a6 6 0 1 0 3.87 10.6l4.26 4.27 1.42-1.42-4.27-4.26A6 6 0 0 0 10 4Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
      </svg>
    </span>
  );
}
