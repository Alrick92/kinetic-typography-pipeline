import type { AnimationSchedule, KaraokeCue, RevealStyle, TranscriptResult, Word } from "../types.js";
import { splitIntoLines } from "./lines.js";

const LINE_BASED_STYLES: RevealStyle[] = ["clean-feed"];

const toCue = (words: Word[]): KaraokeCue => ({
  text: words.map((w) => w.text).join(" "),
  start: words[0].start,
  end: words[words.length - 1].end,
  words,
});

/**
 * Every reveal style consumes one of two cue shapes: a flat per-word timeline
 * ("word-pop" shape — used by focus-word and the caption strip in vertical-show/orbit)
 * or grouped cues with per-word timing ("karaoke" shape — used by clean-feed). Grouped
 * cues are short display lines split out of each transcript segment — never whole
 * segments, which can be a minute of speech long.
 */
export function buildSchedule(transcript: TranscriptResult, style: RevealStyle): AnimationSchedule {
  if (LINE_BASED_STYLES.includes(style)) {
    return { style: "karaoke", cues: transcript.phrases.flatMap((p) => splitIntoLines(p.words).map(toCue)) };
  }

  return { style: "word-pop", cues: transcript.words };
}
