import type { Word } from "../types.js";

// Sized so a line fits on one row at the line-based styles' font sizes on a vertical
// frame (occasionally two for lyrics-scroll's larger current line).
const MAX_LINE_CHARS = 32;
// Clause pieces shorter than this get joined with a neighbouring clause, so fragments
// like "Mais," or "ça va." don't sit alone on a line.
const MIN_LINE_CHARS = 14;
// A silence this long between two words always starts a new line.
const PAUSE_BREAK_SEC = 0.6;

const SENTENCE_END = /[.!?…]["'»”’)\]]*$/;
const CLAUSE_END = /[,;:—–]["'»”’)\]]*$/;

const lengthOf = (words: Word[]) => words.reduce((n, w, i) => n + w.text.length + (i > 0 ? 1 : 0), 0);
const last = <T>(items: T[]) => items[items.length - 1];

/**
 * Splits one transcript segment into short, lyric-length display lines. Transcription
 * segments can run for a minute or more of continuous speech; rendering one as a single
 * "line" wraps it into a wall of text that never moves.
 *
 * 1. Break at every sentence end, clause punctuation, and long pause.
 * 2. Rejoin clause pieces that are too short to stand alone, when they still fit.
 * 3. Divide any piece that's still too long into lines of roughly equal length, rather
 *    than filling greedily, which strands the last word or two on a line of their own.
 */
export function splitIntoLines(words: Word[]): Word[][] {
  const cleaned = words.map((w) => ({ ...w, text: w.text.trim() })).filter((w) => w.text);

  const pieces: Word[][] = [];
  let current: Word[] = [];
  cleaned.forEach((word, i) => {
    current.push(word);
    const next = cleaned[i + 1];
    const pause = next ? next.start - word.end : 0;
    if (SENTENCE_END.test(word.text) || CLAUSE_END.test(word.text) || pause >= PAUSE_BREAK_SEC) {
      pieces.push(current);
      current = [];
    }
  });
  if (current.length > 0) pieces.push(current);

  const joined: Word[][] = [];
  for (const piece of pieces) {
    const prev = last(joined);
    const canJoin =
      prev !== undefined &&
      CLAUSE_END.test(last(prev).text) &&
      piece[0].start - last(prev).end < PAUSE_BREAK_SEC &&
      (lengthOf(prev) < MIN_LINE_CHARS || lengthOf(piece) < MIN_LINE_CHARS) &&
      lengthOf(prev) + 1 + lengthOf(piece) <= MAX_LINE_CHARS;
    if (canJoin) joined[joined.length - 1] = [...prev, ...piece];
    else joined.push(piece);
  }

  return joined.flatMap(balance);
}

function balance(piece: Word[]): Word[][] {
  const total = lengthOf(piece);
  if (total <= MAX_LINE_CHARS) return [piece];

  const lineCount = Math.ceil(total / MAX_LINE_CHARS);
  const target = total / lineCount;
  const lines: Word[][] = [];
  let current: Word[] = [];
  let chars = 0;

  for (const word of piece) {
    if (current.length > 0) {
      const withWord = chars + 1 + word.text.length;
      const moreLinesAvailable = lineCount - lines.length > 1;
      // Break where the line ends closest to the target length.
      const closerToTargetWithout = withWord - target > target - chars;
      if (withWord > MAX_LINE_CHARS || (moreLinesAvailable && closerToTargetWithout)) {
        lines.push(current);
        current = [];
        chars = 0;
      }
    }
    chars = current.length === 0 ? word.text.length : chars + 1 + word.text.length;
    current.push(word);
  }
  lines.push(current);
  return lines;
}
