import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { RenderInputProps } from "../props";
import { findAnchorCueIndex } from "../util/findActiveCue";
import { resolveFontFamily } from "../shared/fonts";

// How many lines above/below the active one we bother rendering — keeps this
// cheap on long transcripts without needing real scroll-position measurement.
const WINDOW = 4;

export const LyricsScrollComposition: React.FC<RenderInputProps> = ({ schedule, config }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeSec = frame / fps;

  if (schedule.style !== "karaoke") {
    throw new Error("LyricsScrollComposition received a non-karaoke schedule");
  }

  const lines = schedule.cues;
  // Anchored to the most recently *started* line rather than the strictly active
  // one, so a silence gap between phrases holds the view on the line that just
  // finished instead of snapping back to line 0 (a strict "active now" lookup
  // returns none mid-gap, which used to reset the anchor to 0 every pause).
  const anchorIndex = findAnchorCueIndex(lines, timeSec);
  const anchor = anchorIndex >= 0 ? anchorIndex : 0;

  // Smoothly animates the scroll position from the previous line to the current
  // one each time the active line advances, instead of jumping instantly.
  const lineStartFrame = anchorIndex >= 0 ? Math.round(lines[anchorIndex].start * fps) : 0;
  const settleProgress = spring({ frame: frame - lineStartFrame, fps, config: { damping: 20, stiffness: 120 } });
  const scrollPosition = anchor - (1 - settleProgress);

  const currentFontSize = config.text.fontSize * 0.62;
  const otherFontSize = config.text.fontSize * 0.32;
  const lineHeight = config.text.fontSize * 1.15;

  const windowStart = Math.max(0, anchor - WINDOW);
  const windowEnd = Math.min(lines.length, anchor + WINDOW + 1);
  const visibleLines = lines.slice(windowStart, windowEnd);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ position: "relative", width: "100%", height: 0 }}>
          {visibleLines.map((line, i) => {
            const lineIndex = windowStart + i;
            const isCurrent = anchorIndex >= 0 && lineIndex === anchor;
            const distance = Math.abs(lineIndex - anchor);
            const offsetPx = (lineIndex - scrollPosition) * lineHeight;
            // The immediate previous/next line gets a clear, distinct opacity of its own
            // (not just the next step down from "current") so it reads as visible context
            // during the scroll transition, rather than fading in from near-invisible.
            const opacity = isCurrent ? 1 : distance === 1 ? 0.6 : Math.max(0.16, 0.4 - distance * 0.08);

            return (
              <div
                key={`${lineIndex}-${line.text}`}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translateY(${offsetPx}px) translateY(-50%)`,
                  textAlign: "center",
                  padding: "0 8%",
                  fontFamily: resolveFontFamily(config.text.font),
                  fontSize: isCurrent ? currentFontSize : otherFontSize,
                  fontWeight: isCurrent ? 700 : 400,
                  WebkitTextStroke: isCurrent ? `1.5px ${config.text.highlightColor}` : undefined,
                  paintOrder: "stroke fill",
                  color: isCurrent ? config.text.highlightColor : config.text.color,
                  opacity,
                  lineHeight: 1.3,
                }}
              >
                {line.text}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
