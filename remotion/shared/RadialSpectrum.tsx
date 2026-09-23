import React from "react";
import { useAudioBands } from "../util/useAudioBands";

const NUM_BANDS = 32;

export const RadialSpectrum: React.FC<{
  audioFileName: string;
  color: string;
  innerRadius: number;
  maxSpikeLength: number;
  size: number;
}> = ({ audioFileName, color, innerRadius, maxSpikeLength, size }) => {
  const bands = useAudioBands(audioFileName, NUM_BANDS);

  if (!bands) return null;

  // Mirrored left/right (bass at the top, treble at the bottom) so the whole ring pulses
  // with the audio rather than one side of it.
  const spikes = bands.concat([...bands].reverse());
  const center = size / 2;

  return (
    <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
      {spikes.map((amplitude, i) => {
        const angle = -Math.PI / 2 + ((i + 0.5) / spikes.length) * Math.PI * 2;
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
