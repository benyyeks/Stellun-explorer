/** Built-in STELLUN avatars (static images in /public/avatars).
 *  Stored on the profile as path preset:<id> — no Storage upload required.
 */
export type PresetAvatar = {
  id: string;
  label: string;
  /** Public URL path, e.g. /avatars/star-cadet.jpg */
  src: string;
};

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: "star-cadet", label: "Star Cadet", src: "/star-cadet.jpg" },
  { id: "jet-pilot", label: "Jet Pilot", src: "/avatars/jet-pilot.jpg" },
  { id: "ace-bulldog", label: "Ace Bulldog", src: "/avatars/ace-bulldog.jpg" },
  { id: "chip-the-robot", label: "Chip the Robot", src: "/avatars/chip-the-robot.jpg" },
  { id: "cosmic-fox", label: "Cosmic Fox", src: "/avatars/cosmic-fox.jpg" },
  { id: "galaxy-kitty", label: "Galaxy Kitty", src: "/avatars/galaxy-kitty.jpg" },
  { id: "curiosity-alien", label: "Curiosity Alien", src: "/avatars/curiosity-alien.jpg" },
  { id: "sky-eagle", label: "Sky Eagle", src: "/avatars/sky-eagle.jpg" },
  { id: "starfighter", label: "Starfighter", src: "/avatars/starfighter.jpg" },
  { id: "reentry-capsule", label: "Re-entry Capsule", src: "/avatars/reentry-capsule.jpg" },
];

export function presetDataUrl(id: string): string | null {
  const p = PRESET_AVATARS.find((a) => a.id === id);
  return p?.src ?? null;
}

export function isPresetPath(path: string | null | undefined): boolean {
  return Boolean(path && path.startsWith("preset:"));
}

export function presetIdFromPath(path: string): string {
  return path.slice("preset:".length);
}
