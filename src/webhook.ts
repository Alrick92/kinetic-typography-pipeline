#!/usr/bin/env node
import "dotenv/config";
import express from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { deepMerge, loadConfig } from "./config.js";
import { PipelineError } from "./errors.js";
import { logger, stageLogger } from "./logger.js";
import { requireApiKey } from "./api/auth.js";
import { completeJob, createJob, failJob, jobs, pendingByUniScribeId } from "./api/jobStore.js";
import { enqueueRenderTask, queueStats } from "./api/jobQueue.js";
import { BACKGROUND_COLOR_CATALOG, BACKGROUND_TYPE_CATALOG, REVEAL_STYLE_CATALOG } from "./api/styleCatalog.js";
import { resolveBackgroundColor } from "./backgroundColors.js";
import { finishPipelineFromTranscription, runPipeline, startTranscription, UniScribeClient } from "./pipeline.js";

const log = stageLogger("api-server");
const app = express();
app.use(express.json());

const PORT = Number(process.env.WEBHOOK_PORT ?? 4000);
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL; // required for mode: "webhook"
const UPLOAD_DIR = path.resolve(process.cwd(), "data/uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB
});

app.use(requireApiKey);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptimeSec: Math.round(process.uptime()) });
});

app.get("/styles", (_req, res) => {
  res.json({
    revealStyles: REVEAL_STYLE_CATALOG,
    backgroundTypes: BACKGROUND_TYPE_CATALOG,
    backgroundColors: BACKGROUND_COLOR_CATALOG,
  });
});

app.get("/queue", (_req, res) => {
  res.json(queueStats());
});

function parseConfigOverrides(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error("configOverrides must be valid JSON");
    }
  }
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return undefined;
}

/** Combines the convenience fields (style/title/description/...) with a freeform configOverrides blob. */
function buildInlineOverrides(body: Record<string, any>): Record<string, unknown> | undefined {
  const showFields: Record<string, unknown> = {
    title: body.title,
    coverImagePath: body.coverImagePath,
    description: body.description,
    episodeLabel: body.episodeLabel,
  };
  const hasShowFields = Object.values(showFields).some((v) => v !== undefined);

  let overrides: Record<string, unknown> = {};
  if (body.style) overrides.reveal = { style: body.style };
  if (body.background) overrides.background = { color: resolveBackgroundColor(body.background) };
  if (hasShowFields) overrides.show = showFields;

  const configOverrides = parseConfigOverrides(body.configOverrides);
  if (configOverrides) overrides = deepMerge(overrides, configOverrides);

  return Object.keys(overrides).length > 0 ? overrides : undefined;
}

app.post("/render", upload.fields([{ name: "audio", maxCount: 1 }, { name: "cover", maxCount: 1 }]), async (req, res) => {
  const files = req.files as { audio?: Express.Multer.File[]; cover?: Express.Multer.File[] } | undefined;
  const uploadedAudioPath = files?.audio?.[0]?.path;
  const uploadedCoverPath = files?.cover?.[0]?.path;

  const audioFilePath = uploadedAudioPath ?? req.body?.audioFilePath;
  if (!audioFilePath) {
    return res.status(400).json({
      error: "Provide an audio file (multipart field \"audio\") or a server-side audioFilePath (JSON body).",
    });
  }
  if (!uploadedAudioPath && !fs.existsSync(audioFilePath)) {
    return res.status(400).json({ error: `audioFilePath does not exist on server: ${audioFilePath}` });
  }

  const { languageCode, mode, configPath } = req.body ?? {};

  // Uploaded files are stored under a random name (see multer config above) to avoid
  // collisions, so default the output name from the *original* upload filename rather
  // than that temp path — "episode.mp3" in should mean "episode.mp4" out.
  const uploadedAudioOriginalName = files?.audio?.[0]?.originalname;
  const outputFileName: string | undefined =
    req.body?.outputFileName ||
    (uploadedAudioOriginalName
      ? `${path.basename(uploadedAudioOriginalName, path.extname(uploadedAudioOriginalName))}.mp4`
      : undefined);

  let inlineOverrides: Record<string, unknown> | undefined;
  try {
    inlineOverrides = buildInlineOverrides(req.body ?? {});
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
  if (uploadedCoverPath) {
    inlineOverrides = deepMerge(inlineOverrides ?? {}, { show: { coverImagePath: uploadedCoverPath } });
  }

  let config;
  try {
    config = loadConfig(configPath, inlineOverrides);
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }

  const localJobId = randomUUID();
  createJob(localJobId);

  if (mode === "webhook") {
    if (!PUBLIC_BASE_URL) {
      return res.status(400).json({ error: "PUBLIC_BASE_URL env var must be set to use mode: 'webhook'" });
    }
    try {
      const handle = await startTranscription(audioFilePath, languageCode, `${PUBLIC_BASE_URL}/uniscribe/webhook`);
      if (handle.kind === "cached") {
        // Cached transcript means no UniScribe round-trip is needed; runPipeline() hits
        // the same cache and goes straight to rendering.
        enqueueRender(localJobId, () => runPipeline({ audioFilePath, config, languageCode, outputFileName }));
      } else {
        pendingByUniScribeId.set(handle.jobId, { localJobId, audioFilePath, audioHash: handle.audioHash, config, outputFileName });
      }
    } catch (err) {
      recordFailure(localJobId, err);
    }
  } else {
    enqueueRender(localJobId, () => runPipeline({ audioFilePath, config, languageCode, outputFileName }));
  }

  res.status(202).json({ jobId: localJobId, statusUrl: `/render/${localJobId}`, downloadUrl: `/render/${localJobId}/download` });
});

app.get("/render/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "unknown jobId" });
  res.json(job);
});

app.get("/render/:jobId/download", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "unknown jobId" });
  if (job.status !== "completed" || !job.outputPath) {
    return res.status(409).json({ error: `job is ${job.status}, not ready for download` });
  }
  if (!fs.existsSync(job.outputPath)) {
    return res.status(410).json({ error: "output file no longer exists on server" });
  }
  res.download(job.outputPath);
});

// UniScribe posts here when a transcription job finishes, if mode: "webhook" was used.
app.post("/uniscribe/webhook", async (req, res) => {
  const { event, data } = req.body ?? {};
  log.info({ event, id: data?.id }, "received UniScribe webhook");
  res.sendStatus(200); // ack immediately; UniScribe requires 2xx within 30s

  const pending = data?.id ? pendingByUniScribeId.get(data.id) : undefined;
  if (!pending) {
    log.warn({ id: data?.id }, "webhook for unknown/already-handled job id");
    return;
  }
  pendingByUniScribeId.delete(data.id);

  if (event === "transcription.failed") {
    recordFailure(pending.localJobId, new Error(data?.error_message ?? "transcription failed"));
    return;
  }
  if (event !== "transcription.completed") return;

  // The transcript is ready, but the actual render (the CPU/RAM-heavy part) still
  // goes through the same queue as poll-mode jobs, so a burst of webhook completions
  // arriving together doesn't spawn a pile of concurrent headless-Chrome renders.
  enqueueRender(pending.localJobId, async () => {
    const client = new UniScribeClient({ apiKey: process.env.UNISCRIBE_API_KEY ?? "", baseUrl: process.env.UNISCRIBE_BASE_URL });
    const full = await client.getTranscription(data.id);
    return finishPipelineFromTranscription(full, pending.audioFilePath, pending.audioHash, pending.config, pending.outputFileName);
  });
});

function enqueueRender(localJobId: string, fn: () => Promise<string>) {
  enqueueRenderTask(localJobId, () =>
    fn()
      .then((outputPath) => completeJob(localJobId, outputPath))
      .catch((err) => recordFailure(localJobId, err)),
  );
}

function recordFailure(localJobId: string, err: unknown) {
  const message = err instanceof PipelineError ? err.message : (err as Error).message;
  failJob(localJobId, message);
  log.error({ jobId: localJobId, err: message }, "job failed");
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  log.error({ err }, "unhandled request error");
  res.status(500).json({ error: "internal server error" });
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, "kinetic-typography API server listening");
});
