/** Binary search for the cue active at `timeSec`, given cues sorted ascending by `start`. Returns -1 if none. */
export function findActiveCueIndex<T extends { start: number; end: number }>(cues: T[], timeSec: number): number {
  let lo = 0;
  let hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const cue = cues[mid];
    if (timeSec < cue.start) {
      hi = mid - 1;
    } else if (timeSec >= cue.end) {
      lo = mid + 1;
    } else {
      return mid;
    }
  }
  return -1;
}

/**
 * Binary search for the last cue whose `start` is at or before `timeSec` — i.e. the
 * most recently begun cue, even if it has already ended (mid-pause between phrases).
 * Used by line-scrolling reveal styles (lyrics-scroll, clean-feed) to keep the view
 * anchored to the last-shown line during a silence gap, instead of `findActiveCueIndex`
 * returning -1 there and the scroll position snapping back to the first line.
 * Returns -1 if `timeSec` is before the first cue starts.
 */
export function findAnchorCueIndex<T extends { start: number }>(cues: T[], timeSec: number): number {
  let lo = 0;
  let hi = cues.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].start <= timeSec) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}
