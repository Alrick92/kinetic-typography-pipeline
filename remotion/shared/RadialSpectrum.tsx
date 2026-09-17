import React from "react";
import { staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useAudioData, visualizeAudio } from "@remotion/media-utils";
import { toDisplayBands } from "../util/audioBands";

const NUM_SPIKES = 64; // visualizeAudio requires a power of two

export const RadialSpectrum: React.FC<{
  audioFileName: string;
  color: string;
  innerRadius: number;
  maxSpikeLength: number;
  size: number;
}> = ({ audioFileName, color, innerRadius, maxSpikeLength, size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audioData = useAudioData(staticFile(audioFileName));

  if (!audioData) return null;

  const frequencies = toDisplayBands(visualizeAudio({ fps, frame, audioData, numberOfSamples: NUM_SPIKES }), NUM_SPIKES);
  const center = size / 2;

  return (
    <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
      {frequencies.map((amplitude, i) => {
        const angle = (i / frequencies.length) * Math.PI * 2;
        const len = maxSpikeLength * Math.max(0.08, amplitude);
        const x1 = center + Math.cos(angle) * innerRadius;
        const y1 = center + Math.sin(angle) * innerRadius;
        const x2 = center + Math.cos(angle) * (innerRadius + len);
        const y2 = center + Math.sin(angle) * (innerRadius + len);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={3} strokeLinecap="round" />;
      })}
    </svg>
  );
};
