export function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.55">
        <line x1="16" y1="16" x2="6.5" y2="7.5" />
        <line x1="16" y1="16" x2="26.5" y2="9" />
        <line x1="16" y1="16" x2="24.5" y2="24.5" />
        <line x1="16" y1="16" x2="7.5" y2="25.5" />
      </g>
      <g fill="currentColor">
        <circle cx="6.5" cy="7.5" r="2.5" opacity="0.9" />
        <circle cx="26.5" cy="9" r="2" opacity="0.8" />
        <circle cx="24.5" cy="24.5" r="2.3" opacity="0.85" />
        <circle cx="7.5" cy="25.5" r="1.8" opacity="0.75" />
      </g>
      <circle cx="16" cy="16" r="4.2" fill="currentColor" />
      <circle cx="16" cy="16" r="7" stroke="currentColor" strokeWidth="1" opacity="0.25" />
    </svg>
  );
}
