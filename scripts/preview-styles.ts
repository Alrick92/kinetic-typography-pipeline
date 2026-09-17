#!/usr/bin/env node
/**
 * Renders a short preview clip for every reveal style, using synthetic transcript
 * data (no UniScribe call). Used to generate one-off look-and-feel screenshots.
 */
import "dotenv/config";
import path from "node:path";
import { loadConfig } from "../src/config.js";
import { renderVideo } from "../src/render/renderVideo.js";
import { hashFile } from "../src/cache.js";
import { buildSchedule } from "../src/animation/schedule.js";
import type { Phrase, RevealStyle, TranscriptResult } from "../src/types.js";

const SENTENCE = "the quick brown fox jumps over the lazy dog while the sun sets slowly near the old stone bridge";
const WORD_DURATION = 0.4;

function buildFakeTranscript(): TranscriptResult {
  const tokens = SENTENCE.split(" ");
  const words = tokens.map((text, i) => ({ text, start: i * WORD_DURATION, end: (i + 1) * WORD_DURATION }));
  const phrases: Phrase[] = [
    { text: tokens.slice(0, 8).join(" "), start: words[0].start, end: words[7].end, words: words.slice(0, 8), wordsInterpolated: false },
    { text: tokens.slice(8).join(" "), start: words[8].start, end: words[words.length - 1].end, words: words.slice(8), wordsInterpolated: false },
  ];
  return { granularity: "word", phrases, words, durationSec: words[words.length - 1].end };
}

const RUNS: { style: RevealStyle; configPath?: string; overrides?: Record<string, unknown> }[] = [
  { style: "word-pop", overrides: { background: { type: "solid" } } },
  { style: "karaoke", overrides: { background: { type: "waveform" } } },
  { style: "focus-word", overrides: { background: { type: "solid" } } },
  { style: "clean-feed", overrides: { background: { type: "gradient" } } },
  {
    style: "vertical-show",
    configPath: "config/presets/lime-show.yaml",
    overrides: { show: { title: "Sarah Connor", description: "On Building Calm Software" } },
  },
  {
    style: "orbit",
    configPath: "config/presets/lime-show.yaml",
    overrides: { show: { title: "Sarah Connor", description: "On Building Calm Software", episodeLabel: "EP. 12" } },
  },
];

async function main() {
  const audioFilePath = path.resolve("data/smoketest.wav");
  const transcript = buildFakeTranscript();

  for (const run of RUNS) {
    const config = loadConfig(run.configPath, { reveal: { style: run.style }, ...run.overrides });
    const schedule = buildSchedule(transcript, run.style);
    const outputPath = await renderVideo({
      audioFilePath,
      audioHash: hashFile(audioFilePath),
      schedule,
      config,
      durationSec: transcript.durationSec ?? 0,
      outputFileName: `preview-${run.style}.mp4`,
    });
    console.log(`Rendered: ${outputPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
