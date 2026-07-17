export const DEVFEST_TRACKS = [
  "AI and Machine Learning",
  "Cloud and DevOps",
  "Web",
  "Mobile",
  "Design and UX",
  "Product",
  "Data",
  "Cybersecurity",
  "Web3",
  "Technical Writing",
  "General Technology",
] as const;

export type DevFestTrack = (typeof DEVFEST_TRACKS)[number];

export const isValidTrack = (t: string): t is DevFestTrack =>
  (DEVFEST_TRACKS as readonly string[]).includes(t);
