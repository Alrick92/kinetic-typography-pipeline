import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { RenderInputProps } from "../props";
import { Background } from "../backgrounds/Background";
import { findActiveCueIndex, findAnchorCueIndex } from "../util/findActiveCue";
import { resolveFontFamily } from "../shared/fonts";

// Lines sit in fixed slots (one per transcript phrase) and the whole stack smoothly
// scrolls by one slot at a time — unlike a sliding per-word window, this never
// changes what's on screen enough to reflow/re-wrap, so nothing jumps around.
const WINDOW = 3;

export const CleanFeedComposition: React.FC<RenderInputProps> = ({ schedule, config, audioFileName }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeSec = frame / fps;

  if (schedule.style !== "karaoke") {
    throw new Error("CleanFeedComposition received a non-karaoke schedule");
  }

  const lines = schedule.cues;
  // Anchored to the most recently *started* line rather than the strictly active
  // one, so a silence gap between phrases holds the view (and highlight) on the
  // line that just finished instead of snapping back to line 0 (a strict
  // "active now" lookup returns none mid-gap, which used to reset the anchor to
  // 0 — and drop the highlight entirely — on every pause).
  const anchorIndex = findAnchorCueIndex(lines, timeSec);
  const anchor = anchorIndex >= 0 ? anchorIndex : 0;

  // Smoothly animates the scroll position from the previous line to the current
  // one each time the active line advances, instead of jumping instantly.
  const lineStartFrame = anchorIndex >= 0 ? Math.round(lines[anchorIndex].start * fps) : 0;
  const settleProgress = spring({ frame: frame - lineStartFrame, fps, config: { damping: 20, stiffness: 120 } });
  const scrollPosition = anchor - (1 - settleProgress);

  const fontSize = config.text.fontSize * 0.42;
  const lineHeight = config.text.fontSize * 0.95;

  const windowStart = Math.max(0, anchor - WINDOW);
  const windowEnd = Math.min(lines.length, anchor + WINDOW + 1);
  const visibleLines = lines.slice(windowStart, windowEnd);

  return (
    <AbsoluteFill>
      <Background config={config.background} audioFileName={audioFileName} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ position: "relative", width: "100%", height: 0 }}>
          {visibleLines.map((line, i) => {
            const lineIndex = windowStart + i;
            const isCurrent = anchorIndex >= 0 && lineIndex === anchor;
            const distance = Math.abs(lineIndex - anchor);
            const offsetPx = (lineIndex - scrollPosition) * lineHeight;
            // Once the line's own time window has passed (silence gap before the next
            // line starts), treat every word as already spoken instead of falling back
            // to "no active word", which would otherwise dim the whole line back down.
            const activeWordIndex = isCurrent
              ? timeSec >= line.end
                ? line.words.length
                : findActiveCueIndex(line.words, timeSec)
              : -1;
            // The immediate previous/next line gets a clear, distinct opacity of its own
            // (not just the next step down from "current") so it reads as visible context
            // during the scroll transition, rather than fading in from near-invisible.
            const lineOpacity = isCurrent ? 1 : distance === 1 ? 0.55 : Math.max(0.18, 0.4 - distance * 0.08);

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
                  padding: "0 10%",
                  fontFamily: resolveFontFamily(config.text.font),
                  fontSize,
                  fontWeight: isCurrent ? 700 : 500,
                  color: config.text.color,
                  lineHeight: 1.4,
                  opacity: lineOpacity,
                }}
              >
                {isCurrent
                  ? line.words.map((w, wi) => {
                      const isPast = wi < activeWordIndex;
                      const isActiveWord = wi === activeWordIndex;
                      return (
                        <span
                          key={wi}
                          style={{
                            color: isActiveWord ? config.text.highlightColor : config.text.color,
                            fontWeight: isActiveWord ? 700 : 500,
                            opacity: isActiveWord ? 1 : isPast ? 0.6 : 0.35,
                            marginRight: "0.3em",
                            display: "inline-block",
                          }}
                        >
                          {w.text}
                        </span>
                      );
                    })
                  : line.text}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
