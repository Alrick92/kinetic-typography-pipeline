export interface Word {
  text: string;
  start: number;
  end: number;
}

export interface Phrase {
  text: string;
  start: number;
  end: number;
  speaker?: string;
  words: Word[];
  /** true when `words` was derived by interpolation rather than returned by the API */
  wordsInterpolated: boolean;
}

export type TimestampGranularity = "word" | "phrase";

export interface TranscriptResult {
  granularity: TimestampGranularity;
  phrases: Phrase[];
  words: Word[];
  language?: string;
  durationSec?: number;
}

export type RevealStyle =
  | "word-pop"
  | "karaoke"
  | "focus-word"
  | "clean-feed"
  | "lyrics-scroll"
  | "vertical-show"
  | "orbit";

export interface WordPopSchedule {
  style: "word-pop";
  cues: Word[];
}

export interface KaraokeCue {
  text: string;
  start: number;
  end: number;
  words: Word[];
}

export interface KaraokeSchedule {
  style: "karaoke";
  cues: KaraokeCue[];
}

export type AnimationSchedule = WordPopSchedule | KaraokeSchedule;

export interface PipelineConfig {
  output: {
    orientation: "vertical" | "horizontal";
    width: number;
    height: number;
    fps: number;
    directory: string;
  };
  reveal: {
    style: RevealStyle;
  };
  text: {
    font: string;
    fontSize: number;
    color: string;
    highlightColor: string;
    strokeColor: string;
    strokeWidth: number;
    position: "center" | "lower-third";
  };
  background: {
    type: "solid" | "gradient" | "video" | "waveform";
    color: string;
    gradient: { from: string; to: string; angle: number };
    mediaPath: string | null;
    /** loop length in seconds for `type: "video"` backgrounds (ignored for images) */
    videoLoopSec: number;
    waveform: { color: string; style: "bars" };
  };
  uniscribe: {
    pollIntervalMs: number;
    pollTimeoutMs: number;
  };
  /** metadata used by the "vertical-show" and "orbit" templates; ignored by other reveal styles */
  show: {
    /** falls back to the audio filename (without extension) when null */
    title: string | null;
    coverImagePath: string | null;
    description: string | null;
    episodeLabel: string | null;
    /** number of dots in the Orbit template's progress indicator */
    totalChapters: number;
  };
}
