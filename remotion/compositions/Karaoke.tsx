import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { RenderInputProps } from "../props";
import { findAnchorCueIndex } from "../util/findActiveCue";
import { resolveFontFamily } from "../shared/fonts";

export const KaraokeComposition: React.FC<RenderInputProps> = ({ schedule, config }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeSec = frame / fps;

  if (schedule.style !== "karaoke") {
    throw new Error("KaraokeComposition received a non-karaoke schedule");
  }

  // Anchored to the most recently *started* phrase/word rather than the strictly active
  // one. A strict "active right now" lookup finds nothing in the silence between two
  // words — and real word timestamps always leave a gap there — which would drop every
  // already-highlighted word back to the base color for those few frames, i.e. the line
  // blinks on every single word boundary. The same holds between phrases.
  const activePhraseIndex = findAnchorCueIndex(schedule.cues, timeSec);
  const phrase = activePhraseIndex >= 0 ? schedule.cues[activePhraseIndex] : null;
  const activeWordIndex = phrase ? findAnchorCueIndex(phrase.words, timeSec) : -1;

  const justifyContent = config.text.position === "center" ? "center" : "flex-end";
  const paddingBottom = config.text.position === "lower-third" ? 180 : 0;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ justifyContent, alignItems: "center", paddingBottom, padding: "0 8%" }}>
        {phrase ? (
          <div
            style={{
              width: "100%",
              maxWidth: "100%",
              fontFamily: resolveFontFamily(config.text.font),
              fontSize: config.text.fontSize * 0.6,
              fontWeight: 700,
              textAlign: "center",
              lineHeight: 1.4,
              overflowWrap: "break-word",
            }}
          >
            {phrase.words.map((w, i) => (
              <span
                key={`${w.text}-${i}`}
                style={{
                  color: i <= activeWordIndex ? config.text.highlightColor : config.text.color,
                  WebkitTextStroke: `${config.text.strokeWidth}px ${config.text.strokeColor}`,
                  paintOrder: "stroke fill",
                  marginRight: "0.35em",
                  display: "inline-block",
                }}
              >
                {w.text}
              </span>
            ))}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
