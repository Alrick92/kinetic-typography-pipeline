import type { AnimationSchedule, PipelineConfig } from "../src/types";

export type RenderInputProps = {
  schedule: AnimationSchedule;
  config: PipelineConfig;
  /** filename relative to remotion/public, e.g. "audio/<hash>.mp3" — see renderVideo.ts */
  audioFileName: string;
  durationSec: number;
};

export const defaultInputProps: RenderInputProps = {
  schedule: { style: "word-pop", cues: [] },
  config: {
    output: { orientation: "vertical", width: 1080, height: 1920, fps: 30, directory: "./output" },
    reveal: { style: "word-pop" },
    text: {
      font: "Space Grotesk",
      fontSize: 90,
      color: "#FFFFFF",
      highlightColor: "#FFD400",
      strokeColor: "#000000",
      strokeWidth: 8,
      position: "center",
    },
    background: {
      type: "solid",
      color: "#111111",
      gradient: { from: "#1e1e2f", to: "#0a0a12", angle: 135 },
      mediaPath: null,
      videoLoopSec: 5,
      waveform: { color: "#FFD400", style: "bars" },
    },
    uniscribe: { pollIntervalMs: 45000, pollTimeoutMs: 600000 },
    show: { title: null, coverImagePath: null, description: null, episodeLabel: null, totalChapters: 12 },
  },
  audioFileName: "audio/sample.mp3",
  durationSec: 10,
};
