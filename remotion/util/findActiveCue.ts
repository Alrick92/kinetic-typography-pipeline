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
