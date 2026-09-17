import React from "react";
import { staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useAudioData, visualizeAudio } from "@remotion/media-utils";

const NUM_BARS = 40;
const NUM_SAMPLES = 64; // visualizeAudio requires a power of two

export const MiniWaveform: React.FC<{ audioFileName: string; color: string; width: number; height: number }> = ({
  audioFileName,
  color,
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audioData = useAudioData(staticFile(audioFileName));

  if (!audioData) return <div style={{ width, height }} />;

  const frequencies = visualizeAudio({ fps, frame, audioData, numberOfSamples: NUM_SAMPLES }).slice(0, NUM_BARS);
  const barWidth = width / NUM_BARS;

  return (
    <svg width={width} height={height}>
      {frequencies.map((amplitude, i) => {
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
