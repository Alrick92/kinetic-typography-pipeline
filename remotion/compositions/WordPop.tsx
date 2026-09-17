import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { RenderInputProps } from "../props";
import { findAnchorCueIndex } from "../util/findActiveCue";
import { resolveFontFamily } from "../shared/fonts";

export const WordPopComposition: React.FC<RenderInputProps> = ({ schedule, config }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeSec = frame / fps;

  if (schedule.style !== "word-pop") {
    throw new Error("WordPopComposition received a non-word-pop schedule");
  }

  // Anchored to the most recently started word, so the current word holds on screen
  // through the silence before the next one instead of blanking out for a few frames
  // on every word boundary (real word timestamps always leave a gap between words).
  const activeIndex = findAnchorCueIndex(schedule.cues, timeSec);
  const cue = activeIndex >= 0 ? schedule.cues[activeIndex] : null;

  const justifyContent = config.text.position === "center" ? "center" : "flex-end";
  const paddingBottom = config.text.position === "lower-third" ? 180 : 0;

  let scale = 1;
  let opacity = 1;
  if (cue) {
    const cueStartFrame = Math.round(cue.start * fps);
    const cueEndFrame = Math.round(cue.end * fps);
    scale = spring({ frame: frame - cueStartFrame, fps, config: { damping: 12, stiffness: 200 }, durationInFrames: 8 });
    const fadeOutStart = cueEndFrame - Math.round(fps * 0.08);
    opacity = interpolate(frame, [fadeOutStart, cueEndFrame], [1, 0.85], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{ justifyContent, alignItems: "center", paddingBottom }}
      >
        {cue ? (
          <div
            style={{
              fontFamily: resolveFontFamily(config.text.font),
              fontSize: config.text.fontSize,
              fontWeight: 700,
              color: config.text.color,
              WebkitTextStroke: `${config.text.strokeWidth}px ${config.text.strokeColor}`,
              paintOrder: "stroke fill",
              transform: `scale(${scale})`,
              opacity,
              textAlign: "center",
              maxWidth: "85%",
              lineHeight: 1.1,
            }}
          >
            {cue.text}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
