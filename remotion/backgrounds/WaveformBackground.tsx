import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useAudioData, visualizeAudio, type AudioData } from "@remotion/media-utils";

const NUM_BARS = 48;
// visualizeAudio requires a power-of-two sample count; we take the first NUM_BARS of it.
const NUM_SAMPLES = 64;

export const WaveformBackground: React.FC<{ audioFileName: string; color: string; backdrop: string }> = ({
  audioFileName,
  color,
  backdrop,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const audioData = useAudioData(staticFile(audioFileName));

  return (
    <AbsoluteFill style={{ backgroundColor: backdrop }}>
      {audioData ? (
        <Bars audioData={audioData} frame={frame} fps={fps} width={width} height={height} color={color} />
      ) : null}
    </AbsoluteFill>
  );
};

const Bars: React.FC<{
  audioData: AudioData;
  frame: number;
  fps: number;
  width: number;
  height: number;
  color: string;
}> = ({ audioData, frame, fps, width, height, color }) => {
  const frequencies = visualizeAudio({ fps, frame, audioData, numberOfSamples: NUM_SAMPLES });
  const bars = frequencies.slice(0, NUM_BARS);
  const barWidth = width / NUM_BARS;
  const maxBarHeight = height * 0.25;

  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
      {bars.map((amplitude, i) => {
        const barHeight = Math.max(4, amplitude * maxBarHeight);
        const x = i * barWidth;
        const y = height / 2 - barHeight / 2;
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
