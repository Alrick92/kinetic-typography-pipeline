import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import type { PipelineConfig } from "../../src/types";

// Fraction of the frame height, at the bottom, given to the waveform background's bars.
export const WAVEFORM_BAND_RATIO = 0.22;

const EDGE_FADE_PX = 90;

/**
 * Hosts the text/graphics of every reveal style. When the background draws its own
 * animation (waveform bars), this layer stops above that strip and clips to it, so no
 * style — including the multi-line scrolling ones — can draw text over the bars.
 */
export const TextLayer: React.FC<{ config: PipelineConfig; children: React.ReactNode }> = ({ config, children }) => {
  const { height } = useVideoConfig();
  const reserved = config.background.type === "waveform" ? Math.round(height * WAVEFORM_BAND_RATIO) : 0;

  if (reserved === 0) {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }

  const fade = `linear-gradient(to bottom, black calc(100% - ${EDGE_FADE_PX}px), transparent)`;
  return (
    <AbsoluteFill
      style={{
        bottom: reserved,
        height: "auto",
        overflow: "hidden",
        maskImage: fade,
        WebkitMaskImage: fade,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
