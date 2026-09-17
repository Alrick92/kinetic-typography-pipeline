import type { Word } from "../types.js";

/**
 * Fallback for phrase-level-only transcripts: distributes the phrase's duration
 * across its words proportionally to each word's character length, so longer
 * words get proportionally more on-screen time than the "one word = one slot"
 * naive approach would give them.
 */
export function interpolateWordsWithinPhrase(phraseText: string, start: number, end: number): Word[] {
  const tokens = phraseText.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const duration = Math.max(end - start, 0.001);
  const totalChars = tokens.reduce((sum, t) => sum + t.length, 0) || tokens.length;

  const words: Word[] = [];
  let cursor = start;
  for (const token of tokens) {
    const share = (token.length || 1) / totalChars;
    const wordDuration = duration * share;
    const wordStart = cursor;
    const wordEnd = Math.min(wordStart + wordDuration, end);
    words.push({ text: token, start: wordStart, end: wordEnd });
    cursor = wordEnd;
  }
  // Snap the last word to the phrase end to avoid drift from floating point rounding.
  words[words.length - 1].end = end;
  return words;
}
