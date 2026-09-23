import React from "react";
import { useAudioBands } from "../util/useAudioBands";

const NUM_BANDS = 20;

export const MiniWaveform: React.FC<{ audioFileName: string; color: string; width: number; height: number }> = ({
  audioFileName,
  color,
  width,
  height,
}) => {
  const bands = useAudioBands(audioFileName, NUM_BANDS);

  if (!bands) return <div style={{ width, height }} />;

  // Mirrored with the bass in the middle, so the waveform swells symmetrically from the
  // centre on every beat instead of only its leftmost (bass) bars moving.
  const bars = [...bands].reverse().concat(bands);
  const barWidth = width / bars.length;

  return (
    <svg width={width} height={height}>
      {bars.map((amplitude, i) => {
        const barHeight = Math.max(3, amplitude * height);
        const x = i * barWidth;
        const y = (height - barHeight) / 2;
        return (
          <rect
            key={i}
            x={x + barWidth * 0.15}
            y={y}
            width={barWidth * 0.7}
            height={barHeight}
            rx={barWidth * 0.3}
            fill={color}
          />
        );
      })}
    </svg>
  );
};
