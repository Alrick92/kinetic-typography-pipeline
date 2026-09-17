import React from "react";
import { interpolate, spring } from "remotion";
import type { PipelineConfig, Word } from "../../src/types";
import { resolveFontFamily } from "./fonts";

/**
 * The animated single-word display shared by every reveal style that shows one
 * word at a time (word-pop, focus-word, and the caption strip in vertical-show/orbit).
 */
export const PopWord: React.FC<{
  cue: Word | null;
  frame: number;
  fps: number;
  text: PipelineConfig["text"];
  fontSize?: number;
  textColor?: string;
  /** when set, renders the word on a rounded highlight card instead of a stroked outline */
  cardColor?: string;
}> = ({ cue, frame, fps, text, fontSize, textColor, cardColor }) => {
  if (!cue) return null;

  const cueStartFrame = Math.round(cue.start * fps);
  const cueEndFrame = Math.round(cue.end * fps);
  const scale = spring({ frame: frame - cueStartFrame, fps, config: { damping: 12, stiffness: 200 }, durationInFrames: 8 });
  const fadeOutStart = cueEndFrame - Math.round(fps * 0.08);
  const opacity = interpolate(frame, [fadeOutStart, cueEndFrame], [1, 0.85], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        fontFamily: resolveFontFamily(text.font),
        fontSize: fontSize ?? text.fontSize,
        fontWeight: 700,
        color: textColor ?? text.color,
        WebkitTextStroke: cardColor ? undefined : `${text.strokeWidth}px ${text.strokeColor}`,
        paintOrder: "stroke fill",
        backgroundColor: cardColor,
        padding: cardColor ? "0.1em 0.4em" : undefined,
        borderRadius: cardColor ? 16 : undefined,
        transform: `scale(${scale})`,
        opacity,
        textAlign: "center",
        maxWidth: "85%",
        lineHeight: 1.1,
      }}
    >
      {cue.text}
    </div>
  );
};
