import React from "react";
import { AbsoluteFill, Audio, Composition, staticFile } from "remotion";
import { WordPopComposition } from "./compositions/WordPop";
import { KaraokeComposition } from "./compositions/Karaoke";
import { FocusWordComposition } from "./compositions/FocusWord";
import { CleanFeedComposition } from "./compositions/CleanFeed";
import { VerticalShowComposition } from "./compositions/VerticalShow";
import { OrbitComposition } from "./compositions/Orbit";
import { defaultInputProps, type RenderInputProps } from "./props";
import type { AnimationSchedule } from "../src/types";

const withAudio = (Comp: React.FC<RenderInputProps>): React.FC<RenderInputProps> => {
  const WithAudio: React.FC<RenderInputProps> = (props) => (
    <AbsoluteFill>
      <Comp {...props} />
      <Audio src={staticFile(props.audioFileName)} />
    </AbsoluteFill>
  );
  return WithAudio;
};

const KARAOKE_SCHEDULE: AnimationSchedule = { style: "karaoke", cues: [] };

const COMPOSITIONS: { id: string; component: React.FC<RenderInputProps>; schedule?: AnimationSchedule }[] = [
  { id: "WordPop", component: WordPopComposition },
  { id: "Karaoke", component: KaraokeComposition, schedule: KARAOKE_SCHEDULE },
  { id: "FocusWord", component: FocusWordComposition },
  { id: "CleanFeed", component: CleanFeedComposition },
  { id: "VerticalShow", component: VerticalShowComposition },
  { id: "Orbit", component: OrbitComposition },
];

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {COMPOSITIONS.map(({ id, component, schedule }) => (
        <Composition
          key={id}
          id={id}
          component={withAudio(component)}
          durationInFrames={Math.ceil(defaultInputProps.durationSec * defaultInputProps.config.output.fps)}
          fps={defaultInputProps.config.output.fps}
          width={defaultInputProps.config.output.width}
          height={defaultInputProps.config.output.height}
          defaultProps={{ ...defaultInputProps, schedule: schedule ?? defaultInputProps.schedule }}
          calculateMetadata={async ({ props }) => ({
            durationInFrames: Math.ceil((props.durationSec + 0.5) * props.config.output.fps),
            fps: props.config.output.fps,
            width: props.config.output.width,
            height: props.config.output.height,
          })}
        />
      ))}
    </>
  );
};
