import { stageLogger } from "../logger.js";
import type { UniScribeTranscription } from "../uniscribe/client.js";
import type { Phrase, TranscriptResult, Word } from "../types.js";
import { interpolateWordsWithinPhrase } from "./interpolate.js";

const log = stageLogger("transcript-parse");

/**
 * Normalizes a UniScribe transcription result into our internal shape.
 * Word-level timestamps are used when present (segments[].words[]); otherwise
 * we fall back to interpolating per-word timing within each segment.
 */
export function parseUniScribeTranscript(transcription: UniScribeTranscription): TranscriptResult {
  const result = transcription.result;
  if (!result || result.segments.length === 0) {
    throw new Error(`Transcription ${transcription.id} has no segments`);
  }

  const hasWordLevel = result.segments.every((seg) => Array.isArray(seg.words) && seg.words.length > 0);
  log.info(
    { jobId: transcription.id, granularity: hasWordLevel ? "word" : "phrase" },
    "resolved timestamp granularity",
  );

  const phrases: Phrase[] = result.segments.map((seg) => {
    if (seg.words && seg.words.length > 0) {
      return {
        text: seg.text.trim(),
        start: seg.start,
        end: seg.end,
        speaker: seg.speaker,
        words: seg.words.map((w) => ({ text: w.text, start: w.start, end: w.end })),
        wordsInterpolated: false,
      };
    }
    const words = interpolateWordsWithinPhrase(seg.text, seg.start, seg.end);
    return {
      text: seg.text.trim(),
      start: seg.start,
      end: seg.end,
      speaker: seg.speaker,
      words,
      wordsInterpolated: true,
    };
  });

  const words: Word[] = phrases.flatMap((p) => p.words);

  return {
    granularity: hasWordLevel ? "word" : "phrase",
    phrases,
    words,
    language: transcription.language_code,
    durationSec: transcription.duration,
  };
}
