import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { useAudioBands } from "../util/useAudioBands";
import { WAVEFORM_BAND_RATIO } from "../shared/TextLayer";

const NUM_BARS = 48;

export const WaveformBackground: React.FC<{ audioFileName: string; color: string; backdrop: string }> = ({
  audioFileName,
  color,
  backdrop,
}) => {
  const { width, height } = useVideoConfig();
  const bars = useAudioBands(audioFileName, NUM_BARS);

  return (
    <AbsoluteFill style={{ backgroundColor: backdrop }}>
      {bars ? <Bars bars={bars} width={width} height={height} color={color} /> : null}
    </AbsoluteFill>
  );
};

const Bars: React.FC<{ bars: number[]; width: number; height: number; color: string }> = ({ bars, width, height, color }) => {
  const barWidth = width / bars.length;
  // Bars live in a strip at the bottom of the frame; TextLayer keeps all text above it.
  const bandHeight = height * WAVEFORM_BAND_RATIO;
  const bandCenterY = height - bandHeight / 2;
  const maxBarHeight = bandHeight * 0.8;

  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
      {bars.map((amplitude, i) => {
        const barHeight = Math.max(4, amplitude * maxBarHeight);
        const x = i * barWidth;
        const y = bandCenterY - barHeight / 2;
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
