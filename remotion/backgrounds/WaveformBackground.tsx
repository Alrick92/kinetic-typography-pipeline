import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useAudioData, visualizeAudio, type AudioData } from "@remotion/media-utils";
import { toDisplayBands } from "../util/audioBands";
import { WAVEFORM_BAND_RATIO } from "../shared/TextLayer";

const NUM_BARS = 48;
// visualizeAudio requires a power-of-two sample count; toDisplayBands groups its
// full output (spanning bass through treble) down into NUM_BARS display bars.
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
  const bars = toDisplayBands(frequencies, NUM_BARS);
  const barWidth = width / NUM_BARS;
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
