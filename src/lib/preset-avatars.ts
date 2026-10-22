/** Built-in STELLUN avatars (SVG). Use path preset:<id> — no Storage needed. */
export type PresetAvatar = { id: string; label: string; svg: string };

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: "orbit", label: "Orbit", svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#0b1220"/><circle cx="32" cy="32" r="14" fill="#3f8fe0"/><circle cx="32" cy="32" r="22" fill="none" stroke="#3f8fe0" stroke-width="1.5" opacity="0.45"/></svg>' },
  { id: "comet", label: "Comet", svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#0b1220"/><path d="M10 48 L42 14 L50 20 L18 54 Z" fill="#e0b56e"/><circle cx="46" cy="12" r="4" fill="#fff"/></svg>' },
  { id: "nebula", label: "Nebula", svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#0b1220"/><ellipse cx="32" cy="34" rx="18" ry="11" fill="#a78bfa" opacity="0.75"/><circle cx="22" cy="28" r="8" fill="#a78bfa"/><circle cx="42" cy="26" r="9" fill="#a78bfa"/></svg>' },
  { id: "mars", label: "Mars", svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#0b1220"/><circle cx="32" cy="32" r="16" fill="#c1440e"/><ellipse cx="32" cy="28" rx="10" ry="4" fill="#7f1d1d" opacity="0.35"/></svg>' },
  { id: "saturn", label: "Saturn", svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#0b1220"/><circle cx="32" cy="32" r="11" fill="#e0c689"/><ellipse cx="32" cy="32" rx="24" ry="7" fill="none" stroke="#f5e6b8" stroke-width="2"/></svg>' },
  { id: "rocket", label: "Rocket", svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#0b1220"/><path d="M32 8 L40 38 L32 34 L24 38 Z" fill="#94a3b8"/><path d="M24 38 L18 48 L28 40 M40 38 L46 48 L36 40" fill="#94a3b8" opacity="0.75"/></svg>' },
  { id: "iss", label: "Iss", svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#0b1220"/><rect x="18" y="28" width="28" height="8" rx="2" fill="#38bdf8"/><rect x="8" y="30" width="10" height="4" fill="#38bdf8"/><rect x="46" y="30" width="10" height="4" fill="#38bdf8"/><circle cx="32" cy="32" r="3" fill="#fff"/></svg>' },
  { id: "star", label: "Star", svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#0b1220"/><polygon points="32,8 36,24 52,24 39,34 44,50 32,40 20,50 25,34 12,24 28,24" fill="#fbbf24"/></svg>' },
  { id: "galaxy", label: "Galaxy", svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#0b1220"/><path d="M32 32 m-3 0 a3 3 0 1 0 6 0 a7 7 0 1 0 -14 0 a11 11 0 1 0 22 0 a15 15 0 1 0 -30 0" fill="none" stroke="#818cf8" stroke-width="2"/></svg>' },
  { id: "moon", label: "Moon", svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#0b1220"/><circle cx="30" cy="32" r="15" fill="#cbd5e1"/><circle cx="38" cy="28" r="13" fill="#0b1220"/></svg>' },
  { id: "aurora", label: "Aurora", svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#0b1220"/><path d="M6 34 Q20 18 32 34 T58 34" fill="none" stroke="#34d399" stroke-width="3"/><path d="M6 42 Q20 26 32 42 T58 42" fill="none" stroke="#34d399" stroke-width="2" opacity="0.5"/></svg>' },
  { id: "solar", label: "Solar", svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#0b1220"/><circle cx="32" cy="32" r="11" fill="#f97316"/><line x1="32" y1="8" x2="32" y2="14" stroke="#f97316" stroke-width="2" transform="rotate(0 32 32)"/><line x1="32" y1="8" x2="32" y2="14" stroke="#f97316" stroke-width="2" transform="rotate(45 32 32)"/><line x1="32" y1="8" x2="32" y2="14" stroke="#f97316" stroke-width="2" transform="rotate(90 32 32)"/><line x1="32" y1="8" x2="32" y2="14" stroke="#f97316" stroke-width="2" transform="rotate(135 32 32)"/><line x1="32" y1="8" x2="32" y2="14" stroke="#f97316" stroke-width="2" transform="rotate(180 32 32)"/><line x1="32" y1="8" x2="32" y2="14" stroke="#f97316" stroke-width="2" transform="rotate(225 32 32)"/><line x1="32" y1="8" x2="32" y2="14" stroke="#f97316" stroke-width="2" transform="rotate(270 32 32)"/><line x1="32" y1="8" x2="32" y2="14" stroke="#f97316" stroke-width="2" transform="rotate(315 32 32)"/></svg>' },
  { id: "void", label: "Void", svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#0b1220"/><circle cx="32" cy="32" r="17" fill="none" stroke="#6366f1" stroke-width="2"/><circle cx="32" cy="32" r="5" fill="#6366f1"/></svg>' },
  { id: "probe", label: "Probe", svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#0b1220"/><circle cx="32" cy="26" r="10" fill="#2dd4bf"/><rect x="28" y="34" width="8" height="14" fill="#2dd4bf" opacity="0.85"/><line x1="20" y1="38" x2="10" y2="48" stroke="#2dd4bf" stroke-width="2"/><line x1="44" y1="38" x2="54" y2="48" stroke="#2dd4bf" stroke-width="2"/></svg>' },
  { id: "antenna", label: "Antenna", svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#0b1220"/><ellipse cx="32" cy="38" rx="16" ry="9" fill="none" stroke="#60a5fa" stroke-width="2"/><line x1="32" y1="38" x2="32" y2="16" stroke="#60a5fa" stroke-width="2"/><circle cx="32" cy="14" r="3" fill="#60a5fa"/></svg>' },
  { id: "helmet", label: "Helmet", svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#0b1220"/><circle cx="32" cy="26" r="13" fill="#e2e8f0" opacity="0.9"/><rect x="18" y="28" width="28" height="16" rx="4" fill="#e2e8f0"/><rect x="22" y="26" width="20" height="9" rx="2" fill="#0b1220" opacity="0.45"/></svg>' },
  { id: "wing", label: "Wing", svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#0b1220"/><path d="M8 42 Q32 10 56 42 L46 46 Q32 22 18 46 Z" fill="#a3e635"/></svg>' },
  { id: "radar", label: "Radar", svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#0b1220"/><circle cx="32" cy="32" r="15" fill="none" stroke="#22d3ee" stroke-width="2"/><path d="M32 32 L48 18" stroke="#22d3ee" stroke-width="2"/><circle cx="32" cy="32" r="3" fill="#22d3ee"/></svg>' },
  { id: "astro", label: "Astro", svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#0b1220"/><circle cx="32" cy="20" r="10" fill="#f472b6"/><path d="M16 50 Q16 34 32 34 Q48 34 48 50 Z" fill="#f472b6"/></svg>' },
  { id: "horizon", label: "Horizon", svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#0b1220"/><rect x="6" y="38" width="52" height="14" fill="#0ea5e9" opacity="0.35"/><circle cx="48" cy="18" r="9" fill="#0ea5e9"/></svg>' },
];

export function presetDataUrl(id: string): string | null {
  const p = PRESET_AVATARS.find((a) => a.id === id);
  if (!p) return null;
  return `data:image/svg+xml;utf8,${encodeURIComponent(p.svg)}`;
}

export function isPresetPath(path: string | null | undefined): boolean {
  return Boolean(path && path.startsWith("preset:"));
}

export function presetIdFromPath(path: string): string {
  return path.slice("preset:".length);
}
