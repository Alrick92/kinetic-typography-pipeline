import React from "react";
import type { PipelineConfig } from "../../src/types";
import { SolidBackground } from "./SolidBackground";
import { GradientBackground } from "./GradientBackground";
import { VideoBackground } from "./VideoBackground";
import { WaveformBackground } from "./WaveformBackground";

export const Background: React.FC<{ config: PipelineConfig["background"]; audioFileName: string }> = ({
  config,
  audioFileName,
}) => {
  switch (config.type) {
    case "solid":
      return <SolidBackground color={config.color} />;
    case "gradient":
      return <GradientBackground from={config.gradient.from} to={config.gradient.to} angle={config.gradient.angle} />;
    case "video":
      if (!config.mediaPath) {
        throw new Error('background.type is "video" but background.mediaPath is not set');
      }
      return <VideoBackground mediaPath={config.mediaPath} loopSec={config.videoLoopSec} />;
    case "waveform":
      return (
        <WaveformBackground audioFileName={audioFileName} color={config.waveform.color} backdrop={config.color} />
      );
  }
};
