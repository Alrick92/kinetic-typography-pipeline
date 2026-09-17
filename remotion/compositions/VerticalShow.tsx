import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { RenderInputProps } from "../props";
import { Background } from "../backgrounds/Background";
import { findAnchorCueIndex } from "../util/findActiveCue";
import { PopWord } from "../shared/PopWord";
import { AvatarImage } from "../shared/AvatarImage";
import { MiniWaveform } from "../shared/MiniWaveform";
import { resolveFontFamily } from "../shared/fonts";

export const VerticalShowComposition: React.FC<RenderInputProps> = ({ schedule, config, audioFileName }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const timeSec = frame / fps;

  if (schedule.style !== "word-pop") {
    throw new Error("VerticalShowComposition received a non-word-pop schedule");
  }

  // Anchored so the caption word holds through the silence before the next one
  // instead of blanking out for a few frames on every word boundary.
  const activeIndex = findAnchorCueIndex(schedule.cues, timeSec);
  const cue = activeIndex >= 0 ? schedule.cues[activeIndex] : null;
  const avatarSize = width * 0.34;

  return (
    <AbsoluteFill>
      <Background config={config.background} audioFileName={audioFileName} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: width * 0.14, gap: 20 }}>
        <AvatarImage path={config.show.coverImagePath} size={avatarSize} placeholderColor={config.text.highlightColor} />
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
        <MiniWaveform audioFileName={audioFileName} color={config.text.color} width={width * 0.7} height={80} />
        {config.show.description ? (
          <div
            style={{
              fontFamily: resolveFontFamily(config.text.font),
              fontSize: config.text.fontSize * 0.22,
              color: config.text.color,
              opacity: 0.7,
              textAlign: "center",
              padding: "0 14%",
              lineHeight: 1.4,
            }}
          >
            {config.show.description}
          </div>
        ) : null}
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: width * 0.18 }}>
        <PopWord cue={cue} frame={frame} fps={fps} text={config.text} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
