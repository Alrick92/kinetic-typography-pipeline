#!/usr/bin/env node
/**
 * Renders a short video from synthetic transcript data — no UniScribe call needed.
 * Useful for validating the Remotion render path (fonts, backgrounds, animation
 * timing) in isolation, and as the "render spike" referenced in the README.
 *
 * Usage: npm run test:render -- [reveal-style] [background-type] [background-color]
 *   reveal-style: word-pop | karaoke | focus-word | clean-feed | lyrics-scroll | quote-card | vertical-show | orbit
 *   SMOKETEST_ORIENTATION=horizontal renders 1920x1080 instead of the default vertical frame
 *   background-type: solid | gradient | waveform
 *   background-color: white | black | grey | silver | blue (optional preset override)
 */
import "dotenv/config";
import path from "node:path";
import { loadConfig } from "../src/config.js";
import { renderVideo } from "../src/render/renderVideo.js";
import { hashFile } from "../src/cache.js";
import { buildSchedule } from "../src/animation/schedule.js";
import { resolveBackgroundColor } from "../src/backgroundColors.js";
import type { Phrase, RevealStyle, TranscriptResult } from "../src/types.js";

const style = (process.argv[2] as RevealStyle) ?? "word-pop";
const backgroundType = (process.argv[3] as "solid" | "gradient" | "waveform") ?? "solid";
const backgroundColorName = process.argv[4];

// Shaped like real UniScribe output: a few long, punctuated segments of continuous
// speech (not tidy short phrases), with words carrying their own punctuation.
const SEGMENTS = [
  "I think it's fine now. I don't look back as much, even if I haven't forgotten everything. Some things built me up, and others brought me to my knees. I lost time trying to understand why certain people left.",
  "Now I believe some answers were never meant to arrive. I thought I had to hold on alone, that asking was weakness. Today I stop chasing what wanted to go, and I stop forcing the stories that were never going to work.",
];
const WORD_GAP = 0.12; // real word timestamps never abut exactly
const SENTENCE_GAP = 0.35;
const SEGMENT_GAP = 1.2;

function buildFakeTranscript(): TranscriptResult {
  const phrases: Phrase[] = [];
  let t = 0;
  for (const segment of SEGMENTS) {
    const segmentWords = segment.split(" ").map((text) => {
      const start = t;
      const end = start + 0.18 + text.length * 0.04;
      t = end + (/[.!?]$/.test(text) ? SENTENCE_GAP : WORD_GAP);
      return { text, start, end };
    });
    phrases.push({
      text: segment,
      start: segmentWords[0].start,
      end: segmentWords[segmentWords.length - 1].end,
      words: segmentWords,
      wordsInterpolated: false,
    });
    t = segmentWords[segmentWords.length - 1].end + SEGMENT_GAP;
  }
  const words = phrases.flatMap((p) => p.words);
  return { granularity: "word", phrases, words, durationSec: words[words.length - 1].end };
}

async function main() {
  const audioFilePath = path.resolve("data/smoketest.wav");
  const horizontal = process.env.SMOKETEST_ORIENTATION === "horizontal";
  const config = loadConfig(undefined, {
    ...(horizontal ? { output: { orientation: "horizontal", width: 1920, height: 1080 } } : {}),
    reveal: { style },
    background: {
      type: backgroundType,
      ...(backgroundColorName ? { color: resolveBackgroundColor(backgroundColorName) } : {}),
    },
  });
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
