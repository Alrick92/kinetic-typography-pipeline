import type { AnimationSchedule, RevealStyle, TranscriptResult } from "../types.js";

const PHRASE_BASED_STYLES: RevealStyle[] = ["karaoke", "lyrics-scroll"];

/**
 * Every reveal style consumes one of two cue shapes: a flat per-word timeline
 * ("word-pop" shape — used by word-pop, focus-word, clean-feed, and the caption
 * strip in vertical-show/orbit) or phrase-grouped cues ("karaoke" shape — used by
 * karaoke's per-word highlight and lyrics-scroll's line-by-line display).
 */
export function buildSchedule(transcript: TranscriptResult, style: RevealStyle): AnimationSchedule {
  if (PHRASE_BASED_STYLES.includes(style)) {
    return {
      style: "karaoke",
      cues: transcript.phrases.map((p) => ({
        text: p.text,
        start: p.start,
        end: p.end,
        words: p.words,
      })),
    };
  }

  return { style: "word-pop", cues: transcript.words };
}
