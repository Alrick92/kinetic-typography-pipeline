import type { AnimationSchedule, RevealStyle, TranscriptResult } from "../types.js";

const PHRASE_BASED_STYLES: RevealStyle[] = ["karaoke"];

/**
 * Every reveal style consumes one of two cue shapes: a flat per-word timeline
 * ("word-pop" shape — used by word-pop, focus-word, clean-feed, and the caption
 * strip in vertical-show/orbit) or phrase-grouped cues with per-word highlight
 * windows ("karaoke" shape).
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
