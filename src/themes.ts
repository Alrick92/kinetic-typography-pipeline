import type { RevealStyle } from "./types.js";

export interface ColorTheme {
  label: string;
  background: string;
  text: string;
  /** color of the current (bold) word, the focus-word card, and the waveform background's bars */
  highlight: string;
}

/** Named color templates selectable per video via `theme` (CLI --theme, API/form field, or config). */
export const COLOR_THEMES = {
  "midnight-lime": { label: "Midnight Lime", background: "#0E0E16", text: "#F5F5F7", highlight: "#C6FF34" },
  "electric-blue": { label: "Electric Blue", background: "#1F3BFF", text: "#FFFFFF", highlight: "#FFE14D" },
  "cream-coral": { label: "Cream & Coral", background: "#F6F1E7", text: "#1B1B1F", highlight: "#FF5A36" },
  "lime-violet": { label: "Lime & Violet", background: "#C6FF34", text: "#111111", highlight: "#6A2BFF" },
} as const satisfies Record<string, ColorTheme>;

export type ThemeName = keyof typeof COLOR_THEMES;

export const THEME_NAMES = Object.keys(COLOR_THEMES) as ThemeName[];

/** The theme each style uses when the request doesn't choose one. */
export const STYLE_DEFAULT_THEME: Record<RevealStyle, ThemeName> = {
  "focus-word": "midnight-lime",
  "clean-feed": "cream-coral",
  "vertical-show": "electric-blue",
  orbit: "lime-violet",
};

export function isThemeName(value: string): value is ThemeName {
  return Object.prototype.hasOwnProperty.call(COLOR_THEMES, value);
}
