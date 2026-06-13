import { useId } from "react";

interface LogoProps {
  size?: number;
}

/**
 * Brand mark: a rounded square carrying the blue → teal brand gradient with a
 * white cube glyph. Used in the top bar and favicon.
 */
export function Logo({ size = 34 }: LogoProps) {
  const gradId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 34 34"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="3" y1="2" x2="31" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1fb6ac" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="34" height="34" rx="10" fill={`url(#${gradId})`} />
      {/* inner top highlight */}
      <rect x="1" y="1" width="32" height="32" rx="9" fill="none" stroke="rgba(255,255,255,0.35)" />
      {/* cube glyph (lucide "box"), centered */}
      <g
        transform="translate(7 7) scale(0.83)"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </g>
    </svg>
  );
}
