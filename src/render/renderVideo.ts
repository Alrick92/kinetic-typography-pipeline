import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { RenderError } from "../errors.js";
import { stageLogger } from "../logger.js";
import type { AnimationSchedule, PipelineConfig } from "../types.js";
import type { RenderInputProps } from "../../remotion/props.js";

const log = stageLogger("render");

const REMOTION_ENTRY = path.resolve(process.cwd(), "remotion/index.ts");
const REMOTION_PUBLIC_DIR = path.resolve(process.cwd(), "remotion/public");

const REVEAL_STYLE_TO_COMPOSITION: Record<string, string> = {
  "word-pop": "WordPop",
  karaoke: "Karaoke",
  "focus-word": "FocusWord",
  "clean-feed": "CleanFeed",
  "lyrics-scroll": "LyricsScroll",
  "vertical-show": "VerticalShow",
  orbit: "Orbit",
};

/** Copies a source file into remotion/public/<subdir> so it can be referenced via staticFile(). */
function copyIntoPublic(sourcePath: string, subdir: string, keyHint: string): string {
  const ext = path.extname(sourcePath);
  const destRelative = path.join(subdir, `${keyHint}${ext}`);
  const destAbsolute = path.join(REMOTION_PUBLIC_DIR, destRelative);
  fs.mkdirSync(path.dirname(destAbsolute), { recursive: true });
  if (!fs.existsSync(destAbsolute)) {
    fs.copyFileSync(sourcePath, destAbsolute);
  }
  return destRelative.split(path.sep).join("/");
}

export interface RenderOptions {
  audioFilePath: string;
  audioHash: string;
  schedule: AnimationSchedule;
  config: PipelineConfig;
  durationSec: number;
  outputFileName: string;
}

export async function renderVideo(opts: RenderOptions): Promise<string> {
  const compositionId = REVEAL_STYLE_TO_COMPOSITION[opts.config.reveal.style];
  if (!compositionId) {
    throw new RenderError(`Unknown reveal style "${opts.config.reveal.style}"`);
  }

  const audioFileName = copyIntoPublic(opts.audioFilePath, "audio", opts.audioHash);

  let backgroundConfig = opts.config.background;
  if (backgroundConfig.type === "video" && backgroundConfig.mediaPath) {
    const relative = copyIntoPublic(backgroundConfig.mediaPath, "backgrounds", path.basename(backgroundConfig.mediaPath, path.extname(backgroundConfig.mediaPath)));
    backgroundConfig = { ...backgroundConfig, mediaPath: relative };
  }

  let showConfig = opts.config.show;
  if (showConfig.coverImagePath) {
    const relative = copyIntoPublic(showConfig.coverImagePath, "show", path.basename(showConfig.coverImagePath, path.extname(showConfig.coverImagePath)));
    showConfig = { ...showConfig, coverImagePath: relative };
  }
  if (!showConfig.title) {
    showConfig = { ...showConfig, title: path.basename(opts.audioFilePath, path.extname(opts.audioFilePath)) };
  }

  const inputProps: RenderInputProps = {
    schedule: opts.schedule,
    config: { ...opts.config, background: backgroundConfig, show: showConfig },
    audioFileName,
    durationSec: opts.durationSec,
  };

  log.info({ compositionId }, "bundling remotion project");
  let bundleLocation: string;
  try {
    bundleLocation = await bundle({ entryPoint: REMOTION_ENTRY, publicDir: REMOTION_PUBLIC_DIR });
  } catch (err) {
    throw new RenderError(`Failed to bundle Remotion project: ${(err as Error).message}`);
  }

  log.info({ compositionId }, "selecting composition");
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps,
  }).catch((err) => {
    throw new RenderError(`Failed to select composition "${compositionId}": ${(err as Error).message}`);
  });

  fs.mkdirSync(opts.config.output.directory, { recursive: true });
  const outputLocation = path.resolve(opts.config.output.directory, opts.outputFileName);

  log.info({ outputLocation, width: composition.width, height: composition.height, durationInFrames: composition.durationInFrames }, "rendering media");
  try {
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      audioCodec: "aac",
      outputLocation,
      inputProps,
      onProgress: ({ progress }) => {
        if (Math.round(progress * 100) % 10 === 0) {
          log.info({ progress: `${Math.round(progress * 100)}%` }, "render progress");
        }
      },
    });
  } catch (err) {
    throw new RenderError((err as Error).message);
  }

  log.info({ outputLocation }, "render complete");
  return outputLocation;
}
