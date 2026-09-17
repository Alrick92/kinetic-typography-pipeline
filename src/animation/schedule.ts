import type { AnimationSchedule, RevealStyle, TranscriptResult } from "../types.js";
import { splitIntoLines } from "./lines.js";

const PHRASE_BASED_STYLES: RevealStyle[] = ["karaoke", "lyrics-scroll", "clean-feed"];

/**
 * Every reveal style consumes one of two cue shapes: a flat per-word timeline
 * ("word-pop" shape — used by word-pop, focus-word, and the caption strip in
 * vertical-show/orbit) or line-grouped cues ("karaoke" shape — used by karaoke,
 * lyrics-scroll and clean-feed). Line cues are short display lines split out of each
 * transcript segment, never whole segments, which can be a minute of speech long.
 */
export function buildSchedule(transcript: TranscriptResult, style: RevealStyle): AnimationSchedule {
  if (PHRASE_BASED_STYLES.includes(style)) {
    return {
      style: "karaoke",
      cues: transcript.phrases.flatMap((p) =>
        splitIntoLines(p.words).map((words) => ({
          text: words.map((w) => w.text).join(" "),
          start: words[0].start,
          end: words[words.length - 1].end,
          words,
        })),
      ),
    };
  }

  return { style: "word-pop", cues: transcript.words };
}
