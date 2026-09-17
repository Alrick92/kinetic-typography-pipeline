import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { RenderInputProps } from "../props";
import { findAnchorCueIndex } from "../util/findActiveCue";
import { LABEL_MONO_FAMILY, QUOTE_SERIF_FAMILY } from "../shared/fonts";
import { ScrollingWaveform } from "../shared/ScrollingWaveform";

// The style's fixed palette: its look, independent of text.color/highlightColor.
const ACCENT = "#B9F23F";
const SPOKEN = "#F3F1EC";
const UPCOMING = "#3A3B40";
const LABEL = "#86878C";

const PASSAGE_FADE_FRAMES = 6;

export const QuoteCardComposition: React.FC<RenderInputProps> = ({ schedule, config, audioFileName }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const timeSec = frame / fps;

  if (schedule.style !== "karaoke") {
    throw new Error("QuoteCardComposition received a non-karaoke schedule");
  }

  // Before speech starts, the first passage is already shown, all upcoming.
  const passageIndex = findAnchorCueIndex(schedule.cues, timeSec);
  const passage = schedule.cues[Math.max(passageIndex, 0)];
  const activeWordIndex = passageIndex >= 0 ? findAnchorCueIndex(passage.words, timeSec) : -1;
  const passageStartFrame = passage ? Math.round(passage.start * fps) : 0;
  const opacity =
    passageIndex > 0
      ? interpolate(frame, [passageStartFrame, passageStartFrame + PASSAGE_FADE_FRAMES], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;

  const horizontal = width > height;
  const shortSide = Math.min(width, height);
  const layout = horizontal
    ? {
        marginX: width * 0.062,
        textTop: height * 0.105,
        textWidth: width * 0.62,
        fontSize: height * 0.1,
        ruleTop: height * 0.615,
        ruleWidth: width * 0.155,
        labelSize: height * 0.026,
        waveCenter: height * 0.855,
        windowSec: 6,
      }
    : {
        marginX: width * 0.08,
        textTop: height * 0.18,
        textWidth: width * 0.84,
        fontSize: width * 0.078,
        ruleTop: height * 0.5,
        ruleWidth: width * 0.25,
        labelSize: width * 0.022,
        waveCenter: height * 0.7,
        windowSec: 3.4,
      };

  const label = [config.show.episodeLabel, config.show.title].filter(Boolean).join(" - ").toUpperCase();

  return (
    <AbsoluteFill>
      {passage ? (
        <div
          style={{
            position: "absolute",
            left: layout.marginX,
            top: layout.textTop,
            width: layout.textWidth,
            fontFamily: QUOTE_SERIF_FAMILY,
            fontWeight: 400,
            fontSize: layout.fontSize,
            lineHeight: 1.06,
            letterSpacing: "-0.01em",
            fontVariationSettings: "'opsz' 96",
            opacity,
          }}
        >
          {passage.words.map((word, i) => {
            const color = i < activeWordIndex ? SPOKEN : i === activeWordIndex ? ACCENT : UPCOMING;
            const typographic = word.text.replace(/'/g, "’");
            const text = `${i === 0 ? "“" : ""}${typographic}${i === passage.words.length - 1 ? "”" : ""}`;
            return (
              <React.Fragment key={i}>
                {i > 0 ? " " : null}
                <span style={{ color }}>{text}</span>
              </React.Fragment>
            );
          })}
        </div>
      ) : null}

      <div
        style={{
          position: "absolute",
          left: layout.marginX,
          top: layout.ruleTop,
          width: layout.ruleWidth,
          height: Math.max(2, shortSide * 0.004),
          backgroundColor: ACCENT,
        }}
      />
      {label ? (
        <div
          style={{
            position: "absolute",
            left: layout.marginX,
            top: layout.ruleTop + layout.labelSize * 1.6,
            fontFamily: LABEL_MONO_FAMILY,
            fontSize: layout.labelSize,
            letterSpacing: "0.28em",
            color: LABEL,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      ) : null}

      <ScrollingWaveform
        audioFileName={audioFileName}
        timeSec={timeSec}
        width={width}
        centerY={layout.waveCenter}
        maxAmplitude={shortSide * 0.065}
        wavelengthPx={shortSide * 0.0135}
        windowSec={layout.windowSec}
        color={ACCENT}
        strokeWidth={Math.max(1.5, shortSide * 0.003)}
      />
    </AbsoluteFill>
  );
};
