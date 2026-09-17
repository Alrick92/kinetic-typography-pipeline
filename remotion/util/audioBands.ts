/**
 * Turns a linear FFT magnitude array (as returned by @remotion/media-utils'
 * `visualizeAudio`, ordered low -> high frequency) into `numBars` display values.
 *
 * Two corrections vs. using the raw array directly:
 * - Spans the FULL frequency range instead of slicing off the first N bins, which
 *   would silently discard every bin above that cutoff (i.e. all the treble).
 * - Applies sqrt scaling, because raw FFT magnitude is dominated by bass — music's
 *   low end naturally carries far more energy than hi-hats/cymbals/treble — so a
 *   linear scale makes the visualization look like it only reacts to bass and
 *   ignores treble hits that are clearly audible. Compressing with sqrt brings
 *   quieter high-frequency content back up to where it visibly moves the bars.
 */
export function toDisplayBands(frequencies: number[], numBars: number): number[] {
  const n = frequencies.length;
  const bands = new Array(numBars);
  for (let i = 0; i < numBars; i++) {
    const start = Math.floor((i / numBars) * n);
    const end = Math.max(start + 1, Math.floor(((i + 1) / numBars) * n));
    let max = 0;
    for (let j = start; j < end; j++) {
      if (frequencies[j] > max) max = frequencies[j];
    }
    bands[i] = Math.sqrt(max);
  }
  return bands;
}
