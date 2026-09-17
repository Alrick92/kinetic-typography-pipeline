import path from "node:path";
import { buildSchedule } from "./animation/schedule.js";
import { hashFile, readCachedJobId, readCachedTranscript, writeCachedJobId, writeCachedTranscript } from "./cache.js";
import type { PipelineConfig, TranscriptResult } from "./types.js";
import { parseUniScribeTranscript } from "./transcript/parse.js";
import { UniScribeClient, type UniScribeTranscription } from "./uniscribe/client.js";
import { renderVideo } from "./render/renderVideo.js";
import { stageLogger } from "./logger.js";

const log = stageLogger("pipeline");

export interface RunPipelineOptions {
  audioFilePath: string;
  config: PipelineConfig;
  languageCode?: string;
  webhookUrl?: string;
  outputFileName?: string;
}

function resolveOutputFileName(audioFilePath: string, outputFileName?: string): string {
  return outputFileName ?? `${path.basename(audioFilePath, path.extname(audioFilePath))}.mp4`;
}

async function finishFromTranscript(
  transcript: TranscriptResult,
  audioFilePath: string,
  audioHash: string,
  config: PipelineConfig,
  outputFileName: string,
): Promise<string> {
  const schedule = buildSchedule(transcript, config.reveal.style);
  return renderVideo({
    audioFilePath,
    audioHash,
    schedule,
    config,
    durationSec: transcript.durationSec ?? transcript.phrases.at(-1)?.end ?? 0,
    outputFileName,
  });
}

/** Synchronous (polling) end-to-end run — used by the CLI and the webhook server's "poll" mode. */
export async function runPipeline(opts: RunPipelineOptions): Promise<string> {
  const audioHash = hashFile(opts.audioFilePath);
  log.info({ audioFilePath: opts.audioFilePath, audioHash }, "starting pipeline");

  let transcript = readCachedTranscript(audioHash);
  if (transcript) {
    log.info({ audioHash }, "using cached transcript, skipping UniScribe call");
  } else {
    const client = new UniScribeClient({
      apiKey: process.env.UNISCRIBE_API_KEY ?? "",
      baseUrl: process.env.UNISCRIBE_BASE_URL,
    });

    const jobId = await getOrCreateJob(client, opts.audioFilePath, audioHash, opts.languageCode, opts.webhookUrl);

    const completed = await client.pollUntilComplete(jobId, {
      intervalMs: opts.config.uniscribe.pollIntervalMs,
      timeoutMs: opts.config.uniscribe.pollTimeoutMs,
    });

    transcript = parseUniScribeTranscript(completed);
    writeCachedTranscript(audioHash, transcript);
  }

  const outputFileName = resolveOutputFileName(opts.audioFilePath, opts.outputFileName);
  const outputPath = await finishFromTranscript(transcript, opts.audioFilePath, audioHash, opts.config, outputFileName);
  log.info({ outputPath }, "pipeline complete");
  return outputPath;
}

async function getOrCreateJob(
  client: UniScribeClient,
  audioFilePath: string,
  audioHash: string,
  languageCode?: string,
  webhookUrl?: string,
): Promise<string> {
  const cachedJobId = readCachedJobId(audioHash);
  if (cachedJobId) {
    log.info({ audioHash, jobId: cachedJobId }, "resuming previously-created UniScribe job instead of re-uploading");
    return cachedJobId;
  }
  const { fileKey } = await client.uploadFile(audioFilePath);
  const created = await client.createTranscription({
    fileKey,
    filename: path.basename(audioFilePath),
    languageCode: languageCode ?? "en",
    webhookUrl,
  });
  writeCachedJobId(audioHash, created.id);
  log.info({ audioHash, jobId: created.id }, "created UniScribe transcription job");
  return created.id;
}

export type TranscriptionHandle =
  | { kind: "cached"; transcript: TranscriptResult }
  | { kind: "pending"; jobId: string; audioHash: string };

/**
 * Phase 1 of webhook-driven mode: returns immediately once the job is either
 * satisfied from cache or created upstream. Call `finishPipelineFromTranscription`
 * once UniScribe's webhook reports completion (see src/webhook.ts).
 */
export async function startTranscription(
  audioFilePath: string,
  languageCode: string | undefined,
  webhookUrl: string,
): Promise<TranscriptionHandle> {
  const audioHash = hashFile(audioFilePath);
  const cached = readCachedTranscript(audioHash);
  if (cached) return { kind: "cached", transcript: cached };

  const client = new UniScribeClient({
    apiKey: process.env.UNISCRIBE_API_KEY ?? "",
    baseUrl: process.env.UNISCRIBE_BASE_URL,
  });
  const jobId = await getOrCreateJob(client, audioFilePath, audioHash, languageCode, webhookUrl);
  return { kind: "pending", jobId, audioHash };
}

/** Phase 2 of webhook-driven mode, called from the /uniscribe/webhook handler once a job completes. */
export async function finishPipelineFromTranscription(
  transcription: UniScribeTranscription,
  audioFilePath: string,
  audioHash: string,
  config: PipelineConfig,
  outputFileName?: string,
): Promise<string> {
  const transcript = parseUniScribeTranscript(transcription);
  writeCachedTranscript(audioHash, transcript);
  const resolvedOutputFileName = resolveOutputFileName(audioFilePath, outputFileName);
  return finishFromTranscript(transcript, audioFilePath, audioHash, config, resolvedOutputFileName);
}

export { UniScribeClient };
