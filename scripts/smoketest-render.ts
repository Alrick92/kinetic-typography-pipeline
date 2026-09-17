#!/usr/bin/env node
/**
 * Renders a short video from synthetic transcript data — no UniScribe call needed.
 * Useful for validating the Remotion render path (fonts, backgrounds, animation
 * timing) in isolation, and as the "render spike" referenced in the README.
 *
 * Usage: npm run test:render -- [reveal-style] [background-type] [background-color]
 *   reveal-style: word-pop | karaoke | focus-word | clean-feed | lyrics-scroll | vertical-show | orbit
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

const SENTENCE = "the quick brown fox jumps over the lazy dog while the sun sets slowly near the old stone bridge";
const WORD_DURATION = 0.4;

const PHRASE_SIZE = 4;
const PHRASE_GAP = 1.2; // seconds of silence between phrases, to test behavior during pauses
// Real ASR word timestamps never abut exactly — there's always a little silence between
// words. Modelling that here keeps "what happens between two words" under test.
const WORD_GAP = 0.12;

function buildFakeTranscript(): TranscriptResult {
  const tokens = SENTENCE.split(" ");
  const phrases: Phrase[] = [];
  let t = 0;
  for (let i = 0; i < tokens.length; i += PHRASE_SIZE) {
    const chunk = tokens.slice(i, i + PHRASE_SIZE);
    const chunkWords = chunk.map((text, wi) => {
      const start = t + wi * (WORD_DURATION + WORD_GAP);
      return { text, start, end: start + WORD_DURATION };
    });
    phrases.push({
      text: chunk.join(" "),
      start: chunkWords[0].start,
      end: chunkWords[chunkWords.length - 1].end,
      words: chunkWords,
      wordsInterpolated: false,
    });
    t = chunkWords[chunkWords.length - 1].end + PHRASE_GAP;
  }
  const words = phrases.flatMap((p) => p.words);
  return { granularity: "word", phrases, words, durationSec: words[words.length - 1].end };
}

async function main() {
  const audioFilePath = path.resolve("data/smoketest.wav");
  const config = loadConfig(undefined, {
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
