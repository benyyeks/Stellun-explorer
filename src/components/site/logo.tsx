// STELLUN brand mark: three orbital rings + central multi-point star.
// Colors via CSS variables --logo-orbit / --logo-star (light & dark auto).

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g stroke="var(--logo-orbit, #96601f)" strokeWidth="2.4" strokeLinecap="round">
        <ellipse cx="32" cy="32" rx="26" ry="10" transform="rotate(0 32 32)" />
        <ellipse cx="32" cy="32" rx="26" ry="10" transform="rotate(60 32 32)" />
        <ellipse cx="32" cy="32" rx="26" ry="10" transform="rotate(-60 32 32)" />
      </g>
      {/* 8-point star: white core + navy outline (matches final mark) */}
      <path
        fill="var(--logo-star-core, #ffffff)"
        stroke="var(--logo-star, #1f3555)"
        strokeWidth="1.6"
        strokeLinejoin="round"
        d="M32 18 L34.2 27.2 L43.5 25.5 L36.4 31.2 L42 38.5 L32 34.2 L22 38.5 L27.6 31.2 L20.5 25.5 L29.8 27.2 Z"
      />
    </svg>
  );
}

/** Wordmark: STELLUN — U carries a crisp orbital arc (SVG, never raster). */
export function BrandWord() {
  return (
    <span className="brand-word" aria-label="Stellun">
      <span className="brand-word-text">STELL</span>
      <span className="brand-word-u">
        <span className="brand-word-u-letter">U</span>
        <svg
          className="brand-word-u-arc"
          viewBox="0 0 28 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M2 12.5 C6 3.5, 22 3.5, 26 12.5"
            stroke="var(--logo-u-arc, #8ca5d6)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M4 13 C8 6, 18 5.5, 23 10"
            stroke="var(--logo-u-arc, #8ca5d6)"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.55"
          />
        </svg>
      </span>
      <span className="brand-word-text">N</span>
    </span>
  );
}

export function BrandLockup({ className }: { className?: string }) {
  return (
    <span className={`brand ${className ?? ""}`}>
      <LogoMark className="brand-mark" />
      <BrandWord />
    </span>
  );
}
