#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "./config.js";
import { runPipeline } from "./pipeline.js";
import { PipelineError } from "./errors.js";
import { logger } from "./logger.js";
import { resolveBackgroundColor } from "./backgroundColors.js";

const program = new Command();

program
  .name("kinetic")
  .description("Convert an audio file into a kinetic typography video")
  .version("0.1.0");

program
  .command("render")
  .description("Run the full pipeline: transcribe -> build schedule -> render MP4")
  .requiredOption("-i, --input <file>", "input audio/video file path")
  .option("-c, --config <file>", "path to a YAML/JSON config override")
  .option("-l, --language <code>", "language code for transcription", "en")
  .option("-o, --output <file>", "output MP4 filename (relative to output.directory)")
  .option("-w, --webhook-url <url>", "UniScribe webhook URL for completion notification")
  .option("--style <style>", "reveal style override: word-pop, karaoke, focus-word, clean-feed, lyrics-scroll, quote-card, vertical-show, orbit")
  .option("--background <name>", "background color preset: white, black, grey, silver, blue")
  .option("--title <text>", "video title (used by vertical-show / orbit styles)")
  .option("--cover-image <path>", "path to a cover/avatar image (used by vertical-show / orbit styles)")
  .option("--description <text>", "short description line (used by vertical-show / orbit styles)")
  .option("--episode-label <text>", "episode label, e.g. \"EP. 12\" (used by orbit style)")
  .action(async (options) => {
    try {
      if (!fs.existsSync(options.input)) {
        throw new PipelineError("config", `Input file not found: ${options.input}`, 9);
      }
      const showOverrides = {
        title: options.title,
        coverImagePath: options.coverImage,
        description: options.description,
        episodeLabel: options.episodeLabel,
      };
      const hasShowOverrides = Object.values(showOverrides).some((v) => v !== undefined);
      const inlineOverrides = {
        ...(options.style ? { reveal: { style: options.style } } : {}),
        ...(options.background ? { background: { color: resolveBackgroundColor(options.background) } } : {}),
        ...(hasShowOverrides ? { show: showOverrides } : {}),
      };
      const config = loadConfig(options.config, Object.keys(inlineOverrides).length > 0 ? inlineOverrides : undefined);
      const outputPath = await runPipeline({
        audioFilePath: path.resolve(options.input),
        config,
        languageCode: options.language,
        webhookUrl: options.webhookUrl,
        outputFileName: options.output,
      });
      logger.info({ outputPath }, "done");
      process.exit(0);
    } catch (err) {
      handleFatalError(err);
    }
  });

function handleFatalError(err: unknown): never {
  if (err instanceof PipelineError) {
    logger.error({ stage: err.stage }, err.message);
    process.exit(err.exitCode);
  }
  logger.error({ err }, "unexpected error");
  process.exit(1);
}

program.parseAsync(process.argv);
