import type { AnimationSchedule, KaraokeCue, RevealStyle, TranscriptResult, Word } from "../types.js";
import { groupIntoPassages, splitIntoLines } from "./lines.js";

const LINE_BASED_STYLES: RevealStyle[] = ["karaoke", "lyrics-scroll", "clean-feed"];
const PASSAGE_BASED_STYLES: RevealStyle[] = ["quote-card"];

const toCue = (words: Word[]): KaraokeCue => ({
  text: words.map((w) => w.text).join(" "),
  start: words[0].start,
  end: words[words.length - 1].end,
  words,
});

/**
 * Every reveal style consumes one of two cue shapes: a flat per-word timeline
 * ("word-pop" shape — used by word-pop, focus-word, and the caption strip in
 * vertical-show/orbit) or grouped cues with per-word timing ("karaoke" shape). Grouped
 * cues are short display lines (karaoke, lyrics-scroll, clean-feed) or passages of
 * several lines (quote-card), split out of each transcript segment — never whole
 * segments, which can be a minute of speech long.
 */
export function buildSchedule(transcript: TranscriptResult, style: RevealStyle): AnimationSchedule {
  if (LINE_BASED_STYLES.includes(style)) {
    return { style: "karaoke", cues: transcript.phrases.flatMap((p) => splitIntoLines(p.words).map(toCue)) };
  }
  if (PASSAGE_BASED_STYLES.includes(style)) {
    return {
      style: "karaoke",
      cues: transcript.phrases.flatMap((p) => groupIntoPassages(splitIntoLines(p.words)).map(toCue)),
    };
  }

  return { style: "word-pop", cues: transcript.words };
}
