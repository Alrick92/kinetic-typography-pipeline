// Average advance width of a bold Space Grotesk glyph, in em. Deliberately a little
// generous so the estimate errs towards fitting.
const AVG_CHAR_EM = 0.62;

/**
 * Largest font size up to `target` at which `text` fits on one line within `maxWidth`
 * pixels (`extraEm` covers padding around the text, e.g. the focus-word card). Keeps
 * big single-word captions from overflowing the frame on long words.
 */
export function fitFontSize(text: string, target: number, maxWidth: number, extraEm = 0): number {
  const ems = Math.max(1, text.length) * AVG_CHAR_EM + extraEm;
  return Math.min(target, maxWidth / ems);
}
