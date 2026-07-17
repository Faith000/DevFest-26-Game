/** Emoji avatars — readable at small sizes, no licensing baggage. */
export const AVATARS = [
  "🚌",
  "🛵",
  "🚕",
  "🦺",
  "🧑🏾‍💻",
  "👩🏾‍💻",
  "👨🏾‍💻",
  "🎤",
  "☕",
  "🌴",
  "🦜",
  "⚡",
] as const;

export const DEFAULT_AVATAR = AVATARS[0];

export const isValidAvatar = (a: string): boolean =>
  (AVATARS as readonly string[]).includes(a);
