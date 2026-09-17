#!/usr/bin/env node
/**
 * Renders a short video from synthetic transcript data — no UniScribe call needed.
 * Useful for validating the Remotion render path (fonts, backgrounds, animation
 * timing) in isolation, and as the "render spike" referenced in the README.
 *
 * Usage: npm run test:render -- [reveal-style] [background-type]
 *   reveal-style: word-pop | karaoke | focus-word | clean-feed | vertical-show | orbit
 *   background-type: solid | gradient | waveform
 */
import "dotenv/config";
import path from "node:path";
import { loadConfig } from "../src/config.js";
import { renderVideo } from "../src/render/renderVideo.js";
import { hashFile } from "../src/cache.js";
import { buildSchedule } from "../src/animation/schedule.js";
import type { Phrase, RevealStyle, TranscriptResult } from "../src/types.js";

const style = (process.argv[2] as RevealStyle) ?? "word-pop";
const backgroundType = (process.argv[3] as "solid" | "gradient" | "waveform") ?? "solid";

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

async function main() {
  const audioFilePath = path.resolve("data/smoketest.wav");
  const config = loadConfig(undefined, { reveal: { style }, background: { type: backgroundType } });
  const transcript = buildFakeTranscript();
  const schedule = buildSchedule(transcript, style);

  const outputPath = await renderVideo({
    audioFilePath,
    audioHash: hashFile(audioFilePath),
    schedule,
    config,
    durationSec: transcript.durationSec ?? 0,
    outputFileName: `smoketest-${style}-${backgroundType}.mp4`,
  });

  console.log(`Rendered: ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
