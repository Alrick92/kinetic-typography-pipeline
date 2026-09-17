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
    description: "Full sentence visible, active word highlighted as it's spoken.",
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
    description: "Animated audio-amplitude bars. Do not combine with vertical-show/orbit, which draw their own.",
  },
] as const;
