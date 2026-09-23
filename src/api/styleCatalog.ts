import { BACKGROUND_COLOR_PRESETS } from "../backgroundColors.js";
import { COLOR_THEMES, STYLE_DEFAULT_THEME } from "../themes.js";

/** Static metadata describing each reveal style, for API consumers building a style picker. */
export const REVEAL_STYLE_CATALOG = [
  {
    id: "focus-word",
    label: "Focus Word",
    description: "One word at a time on a highlight card, with faded prev/next word context, elapsed timer, and a progress bar.",
    requiresShowMetadata: false,
    defaultTheme: STYLE_DEFAULT_THEME["focus-word"],
  },
  {
    id: "clean-feed",
    label: "Clean Feed",
    description: "Continuous flowing paragraph; spoken word bold, past text faded, future text dimmer.",
    requiresShowMetadata: false,
    defaultTheme: STYLE_DEFAULT_THEME["clean-feed"],
  },
  {
    id: "vertical-show",
    label: "Vertical Show",
    description: "Cover photo + title + audio waveform card, with one-word captions in the lower third.",
    requiresShowMetadata: true,
    defaultTheme: STYLE_DEFAULT_THEME["vertical-show"],
  },
  {
    id: "orbit",
    label: "Orbit",
    description: "Circular avatar + radial audio spectrum + episode dots, captions in the lower third.",
    requiresShowMetadata: true,
    defaultTheme: STYLE_DEFAULT_THEME["orbit"],
  },
] as const;

/** Named color themes for the `theme` field; each style's `defaultTheme` applies when none is chosen. */
export const THEME_CATALOG = Object.entries(COLOR_THEMES).map(([id, t]) => ({
  id,
  label: t.label,
  background: t.background,
  text: t.text,
  highlight: t.highlight,
}));

export const BACKGROUND_TYPE_CATALOG = [
  { id: "solid", label: "Solid color", description: "Flat background.color." },
  { id: "gradient", label: "Gradient", description: "Linear gradient between gradient.from and gradient.to." },
  { id: "video", label: "Video / image loop", description: "Looping background.mediaPath video or static image." },
  {
    id: "waveform",
    label: "Waveform",
    description:
      "Animated audio-amplitude bars in a strip along the bottom; text is kept above it. Do not combine with vertical-show/orbit, which draw their own.",
  },
] as const;

/** Named presets for the `background` convenience field (sets background.color to a known-good hex value). */
export const BACKGROUND_COLOR_CATALOG = Object.entries(BACKGROUND_COLOR_PRESETS).map(([id, hex]) => ({
  id,
  label: id[0].toUpperCase() + id.slice(1),
  hex,
}));
