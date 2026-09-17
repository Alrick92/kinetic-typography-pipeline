import { BACKGROUND_COLOR_PRESETS } from "../backgroundColors.js";

/** Static metadata describing each reveal style, for API consumers building a style picker. */
export const REVEAL_STYLE_CATALOG = [
  {
    id: "word-pop",
    label: "Word Pop",
    description: "One word centered on screen at a time, replaced as speech progresses.",
    requiresShowMetadata: false,
  },
  {
    id: "karaoke",
    label: "Karaoke",
    description: "One short line at a time; words light up and stay lit as they're spoken.",
    requiresShowMetadata: false,
  },
  {
    id: "focus-word",
    label: "Focus Word",
    description: "Word-pop plus faded prev/next word context, elapsed timer, and a progress bar.",
    requiresShowMetadata: false,
  },
  {
    id: "clean-feed",
    label: "Clean Feed",
    description: "Continuous flowing paragraph; spoken word bold, past text faded, future text dimmer.",
    requiresShowMetadata: false,
  },
  {
    id: "lyrics-scroll",
    label: "Lyrics Scroll",
    description: "Song-lyrics style: lines scroll vertically, previous lines above, current line bold and centered.",
    requiresShowMetadata: false,
  },
  {
    id: "quote-card",
    label: "Quote Card",
    description:
      "Serif pull-quote filling in a passage at a time (spoken white, current word lime, upcoming grey), with a label and a scrolling waveform line. Has its own dark look; use a solid dark background.",
    requiresShowMetadata: false,
  },
  {
    id: "vertical-show",
    label: "Vertical Show",
    description: "Cover photo + title + waveform card, with word-pop captions in the lower third.",
    requiresShowMetadata: true,
  },
  {
    id: "orbit",
    label: "Orbit",
    description: "Circular avatar + radial audio spectrum + episode dots, captions in the lower third.",
    requiresShowMetadata: true,
  },
] as const;

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
