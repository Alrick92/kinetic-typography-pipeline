import { useMemo } from "react";
import { staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useAudioData, visualizeAudio, type AudioData } from "@remotion/media-utils";
import { toDisplayBands } from "./audioBands";

const NUM_SAMPLES = 64; // visualizeAudio requires a power of two
// Frames sampled across the whole track to learn how loud each band normally gets.
const REFERENCE_FRAMES = 240;
// A band's reference level is this percentile of its own values over the track, so
// typical peaks (beats, stressed syllables) reach full height instead of a rare spike.
const REFERENCE_PERCENTILE = 0.9;
// Bands that are almost always empty (e.g. treble in speech) are compared against at
// least this fraction of the loudest band's reference, so hiss isn't blown up to full height.
const REFERENCE_FLOOR = 0.25;

function referenceLevels(audioData: AudioData, fps: number, numBands: number): number[] {
  const totalFrames = Math.floor(audioData.durationInSeconds * fps);
  const step = Math.max(1, totalFrames / REFERENCE_FRAMES);
  const perBand: number[][] = Array.from({ length: numBands }, () => []);
  for (let f = 0; f < totalFrames; f += step) {
    const bands = toDisplayBands(
      visualizeAudio({ fps, frame: Math.floor(f), audioData, numberOfSamples: NUM_SAMPLES }),
      numBands,
    );
    bands.forEach((v, i) => perBand[i].push(v));
  }
  const refs = perBand.map((values) => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * REFERENCE_PERCENTILE))];
  });
  const loudest = Math.max(0, ...refs);
  return refs.map((r) => Math.max(r, loudest * REFERENCE_FLOOR));
}

/**
 * Per-frame audio levels in `numBands` frequency bands (bass first), each 0..1 relative
 * to how loud that band gets across this track. Raw FFT magnitudes are tiny for speech
 * and quiet mixes, so un-normalized bars barely move; scaling each band against the
 * track's own levels makes every beat/syllable visibly hit while silence stays flat.
 * Returns null until the audio has loaded.
 */
export function useAudioBands(audioFileName: string, numBands: number): number[] | null {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audioData = useAudioData(staticFile(audioFileName));
  const reference = useMemo(
    () => (audioData ? referenceLevels(audioData, fps, numBands) : null),
    [audioData, fps, numBands],
  );

  if (!audioData || !reference) return null;

  const bands = toDisplayBands(visualizeAudio({ fps, frame, audioData, numberOfSamples: NUM_SAMPLES }), numBands);
  return bands.map((v, i) => (reference[i] > 0 ? Math.min(1, v / reference[i]) : 0));
}
