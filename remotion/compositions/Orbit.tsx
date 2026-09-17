import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { RenderInputProps } from "../props";
import { Background } from "../backgrounds/Background";
import { findAnchorCueIndex } from "../util/findActiveCue";
import { PopWord } from "../shared/PopWord";
import { AvatarImage } from "../shared/AvatarImage";
import { RadialSpectrum } from "../shared/RadialSpectrum";
import { DotProgress } from "../shared/DotProgress";
import { resolveFontFamily } from "../shared/fonts";

export const OrbitComposition: React.FC<RenderInputProps> = ({ schedule, config, audioFileName, durationSec }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const timeSec = frame / fps;

  if (schedule.style !== "word-pop") {
    throw new Error("OrbitComposition received a non-word-pop schedule");
  }

  // Anchored so the caption word holds through the silence before the next one
  // instead of blanking out for a few frames on every word boundary.
  const activeIndex = findAnchorCueIndex(schedule.cues, timeSec);
  const cue = activeIndex >= 0 ? schedule.cues[activeIndex] : null;

  const avatarSize = width * 0.32;
  const spectrumSize = avatarSize * 1.9;
  const progress = durationSec > 0 ? timeSec / durationSec : 0;
  const filledDots = Math.min(config.show.totalChapters, Math.max(1, Math.round(progress * config.show.totalChapters)));
  const subtitle = [config.show.description, config.show.episodeLabel].filter(Boolean).join(" — ");

  return (
    <AbsoluteFill>
      <Background config={config.background} audioFileName={audioFileName} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 20 }}>
        <div style={{ width: spectrumSize, height: spectrumSize, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <RadialSpectrum
            audioFileName={audioFileName}
            color={config.text.color}
            innerRadius={avatarSize / 2 + 8}
            maxSpikeLength={spectrumSize / 2 - avatarSize / 2 - 12}
            size={spectrumSize}
          />
          <AvatarImage path={config.show.coverImagePath} size={avatarSize} placeholderColor={config.text.highlightColor} />
        </div>
        <div
          style={{
            fontFamily: resolveFontFamily(config.text.font),
            fontSize: config.text.fontSize * 0.4,
            fontWeight: 700,
            color: config.text.color,
            textAlign: "center",
            padding: "0 10%",
          }}
        >
          {config.show.title}
        </div>
        {subtitle ? (
          <div
            style={{
              fontFamily: "monospace",
              fontSize: config.text.fontSize * 0.16,
              color: config.text.color,
              opacity: 0.6,
              textAlign: "center",
              letterSpacing: 1,
            }}
          >
            {subtitle.toUpperCase()}
          </div>
        ) : null}
        <DotProgress total={config.show.totalChapters} filled={filledDots} color={config.text.color} mutedColor={`${config.text.color}55`} />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: width * 0.14 }}>
        <PopWord cue={cue} frame={frame} fps={fps} text={config.text} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
