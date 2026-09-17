import React, { useMemo } from "react";
import { staticFile } from "remotion";
import { useAudioData } from "@remotion/media-utils";

// Loudness is sampled on a coarse grid, then the line itself is drawn much finer so the
// oscillation stays smooth.
const ENVELOPE_POINTS = 240;
const LINE_POINTS = 1600;
const SAMPLE_STRIDE = 4;

/**
 * A single oscillating line whose amplitude follows the audio's loudness, showing a window
 * of time centred on the current moment (the future on the right). The line scrolls left
 * as the audio plays and falls flat wherever there is silence or no audio.
 */
export const ScrollingWaveform: React.FC<{
  audioFileName: string;
  timeSec: number;
  width: number;
  centerY: number;
  maxAmplitude: number;
  wavelengthPx: number;
  windowSec: number;
  color: string;
  strokeWidth: number;
}> = ({ audioFileName, timeSec, width, centerY, maxAmplitude, wavelengthPx, windowSec, color, strokeWidth }) => {
  const audioData = useAudioData(staticFile(audioFileName));

  // Loudness is scaled against the track's own median loudness rather than its sample
  // peak: peaks are rare transients, so peak-relative levels leave most of a track tiny
  // (or, with enough gain, saturate it flat), and the right gain differs between loud
  // mastered music and quieter speech.
  const typicalRms = useMemo(() => {
    if (!audioData) return 0;
    const samples = audioData.channelWaveforms[0];
    const windowSize = Math.round(audioData.sampleRate * 0.025);
    const levels: number[] = [];
    for (let start = 0; start + windowSize < samples.length; start += windowSize) {
      let sum = 0;
      let count = 0;
      for (let i = start; i < start + windowSize; i += SAMPLE_STRIDE) {
        sum += samples[i] * samples[i];
        count++;
      }
      const rms = Math.sqrt(sum / count);
      if (rms > 1e-4) levels.push(rms);
    }
    if (levels.length === 0) return 0;
    levels.sort((a, b) => a - b);
    return levels[Math.floor(levels.length / 2)];
  }, [audioData]);

  const envelope = new Array<number>(ENVELOPE_POINTS).fill(0);
  if (audioData && typicalRms > 0) {
    const samples = audioData.channelWaveforms[0];
    const rate = audioData.sampleRate;
    const halfSpan = Math.round(((windowSec / ENVELOPE_POINTS) * rate) / 2);
    for (let p = 0; p < ENVELOPE_POINTS; p++) {
      const t = timeSec + (p / (ENVELOPE_POINTS - 1) - 0.5) * windowSec;
      const center = Math.round(t * rate);
      const from = Math.max(0, center - halfSpan);
      const to = Math.min(samples.length, center + halfSpan);
      let sum = 0;
      let count = 0;
      for (let i = from; i < to; i += SAMPLE_STRIDE) {
        sum += samples[i] * samples[i];
        count++;
      }
      // Typical loudness lands around half height, bursts reach the top, silence is flat.
      if (count > 0) envelope[p] = Math.min(1, Math.pow(Math.sqrt(sum / count) / (typicalRms * 1.9), 1.3));
    }
  }

  // Phase is tied to audio time rather than screen position, so the waves travel left.
  const secondsPerCycle = (wavelengthPx / width) * windowSec;
  let d = "";
  for (let p = 0; p < LINE_POINTS; p++) {
    const u = p / (LINE_POINTS - 1);
    const e = u * (ENVELOPE_POINTS - 1);
    const lower = Math.floor(e);
    const upper = Math.min(ENVELOPE_POINTS - 1, lower + 1);
    const amplitude = envelope[lower] + (envelope[upper] - envelope[lower]) * (e - lower);
    const t = timeSec + (u - 0.5) * windowSec;
    const y = centerY + amplitude * maxAmplitude * Math.sin((2 * Math.PI * t) / secondsPerCycle);
    d += `${p === 0 ? "M" : "L"}${(u * width).toFixed(1)} ${y.toFixed(1)}`;
  }

  return (
    <svg width={width} height={centerY + maxAmplitude + strokeWidth} style={{ position: "absolute", left: 0, top: 0 }}>
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </svg>
  );
};
