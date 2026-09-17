import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { RenderInputProps } from "../props";
import { Background } from "../backgrounds/Background";
import { findActiveCueIndex } from "../util/findActiveCue";
import { PopWord } from "../shared/PopWord";
import { ProgressBar } from "../shared/ProgressBar";
import { resolveFontFamily } from "../shared/fonts";

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const FocusWordComposition: React.FC<RenderInputProps> = ({ schedule, config, audioFileName, durationSec }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const timeSec = frame / fps;

  if (schedule.style !== "word-pop") {
    throw new Error("FocusWordComposition received a non-word-pop schedule");
  }

  const activeIndex = findActiveCueIndex(schedule.cues, timeSec);
  const cue = activeIndex >= 0 ? schedule.cues[activeIndex] : null;
  const prevCue = activeIndex > 0 ? schedule.cues[activeIndex - 1] : null;
  const nextCue = activeIndex >= 0 && activeIndex < schedule.cues.length - 1 ? schedule.cues[activeIndex + 1] : null;
  const progress = durationSec > 0 ? timeSec / durationSec : 0;
  const contextFontSize = config.text.fontSize * 0.32;

  return (
    <AbsoluteFill>
      <Background config={config.background} audioFileName={audioFileName} />
      <AbsoluteFill style={{ padding: 48 }}>
        <div style={{ fontFamily: "monospace", fontSize: 24, color: config.text.color, opacity: 0.6 }}>
          {formatTime(timeSec)} / {formatTime(durationSec)}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 20 }}>
        <div style={{ fontFamily: resolveFontFamily(config.text.font), fontSize: contextFontSize, color: config.text.color, opacity: 0.35, fontWeight: 600, height: contextFontSize * 1.3 }}>
          {prevCue?.text ?? ""}
        </div>
        <PopWord cue={cue} frame={frame} fps={fps} text={config.text} cardColor={config.text.highlightColor} textColor={config.background.color} />
        <div style={{ fontFamily: resolveFontFamily(config.text.font), fontSize: contextFontSize, color: config.text.color, opacity: 0.35, fontWeight: 600, height: contextFontSize * 1.3 }}>
          {nextCue?.text ?? ""}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 64 }}>
        <ProgressBar progress={progress} color={config.text.highlightColor} trackColor={config.text.color} width={width * 0.8} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
