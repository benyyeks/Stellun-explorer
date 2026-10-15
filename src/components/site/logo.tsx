// STELLUN brand: two crossed orbital ellipses around an 8-point star (SVG),
// plus the official STELLUN logo lettering (light and dark versions).
import logoLight from "@/assets/stellun-logo-light.png.asset.json";
import logoDark from "@/assets/stellun-logo-dark.png.asset.json";

const STAR =
  "M32 14 L34.6 29.4 L50 32 L34.6 34.6 L32 50 L29.4 34.6 L14 32 L29.4 29.4 Z";
const STAR_SMALL =
  "M32 32 L41 23 L36.2 32 L41 41 L32 36.2 L23 41 L27.8 32 L23 23 L32 27.8 L36.2 32 Z";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g stroke="var(--logo-orbit, #96601f)" strokeWidth="2.6">
        <ellipse cx="32" cy="32" rx="28" ry="13" transform="rotate(45 32 32)" />
        <ellipse cx="32" cy="32" rx="28" ry="13" transform="rotate(-45 32 32)" />
      </g>
      <path d={STAR_SMALL} fill="var(--logo-star, #1f3555)" />
      <path d={STAR} fill="var(--logo-star-core, #ffffff)" stroke="var(--logo-star, #1f3555)" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

/** Official STELLUN logo lettering; swaps with the light or dark theme. */
export function BrandWord() {
  return (
    <span className="brand-word-img" role="img" aria-label="Stellun">
      <img src={logoLight.url} alt="" className="brand-word-light" width={409} height={80} />
      <img src={logoDark.url} alt="" className="brand-word-dark" width={409} height={80} />
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
