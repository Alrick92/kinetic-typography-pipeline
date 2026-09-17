import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { RenderInputProps } from "../props";
import { Background } from "../backgrounds/Background";
import { findActiveCueIndex } from "../util/findActiveCue";
import { resolveFontFamily } from "../shared/fonts";

// Rather than scrolling the whole transcript (which needs real layout
// measurement), we render a fixed-size window around the active word and let
// it visually "flow" as new words enter and old ones leave the window.
const WINDOW_BEFORE = 12;
const WINDOW_AFTER = 18;

export const CleanFeedComposition: React.FC<RenderInputProps> = ({ schedule, config, audioFileName }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeSec = frame / fps;

  if (schedule.style !== "word-pop") {
    throw new Error("CleanFeedComposition received a non-word-pop schedule");
  }

  const cues = schedule.cues;
  const activeIndex = findActiveCueIndex(cues, timeSec);
  const anchor = activeIndex >= 0 ? activeIndex : 0;
  const windowStart = Math.max(0, anchor - WINDOW_BEFORE);
  const windowEnd = Math.min(cues.length, anchor + WINDOW_AFTER);
  const windowWords = cues.slice(windowStart, windowEnd);

  return (
    <AbsoluteFill>
      <Background config={config.background} audioFileName={audioFileName} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 10%" }}>
        <div
          style={{
            fontFamily: resolveFontFamily(config.text.font),
            fontSize: config.text.fontSize * 0.42,
            fontWeight: 600,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          {windowWords.map((w, i) => {
            const globalIndex = windowStart + i;
            const isPast = globalIndex < activeIndex;
            const isActive = globalIndex === activeIndex;
            return (
              <span
                key={`${w.text}-${globalIndex}`}
                style={{
                  opacity: isActive ? 1 : isPast ? 0.35 : 0.16,
                  color: isActive ? config.text.highlightColor : config.text.color,
                  fontWeight: isActive ? 800 : 500,
                  marginRight: "0.32em",
                  display: "inline-block",
                }}
              >
                {w.text}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
