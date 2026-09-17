import type { PipelineConfig } from "../types.js";

export type JobStatus = "processing" | "completed" | "failed";

export interface JobRecord {
  status: JobStatus;
  outputPath?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PendingUniScribeJob {
  localJobId: string;
  audioFilePath: string;
  audioHash: string;
  config: PipelineConfig;
  outputFileName?: string;
}

/**
 * In-memory job registry. Fine for a single long-running server process; a job
 * lost on restart just needs to be re-submitted (the transcript cache in
 * src/cache.ts avoids re-billing UniScribe for the same audio file).
 */
export const jobs = new Map<string, JobRecord>();

/** Maps a UniScribe transcription id -> the render request waiting on it (webhook completion mode only). */
export const pendingByUniScribeId = new Map<string, PendingUniScribeJob>();

export function createJob(localJobId: string): void {
  const now = new Date().toISOString();
  jobs.set(localJobId, { status: "processing", createdAt: now, updatedAt: now });
}

export function completeJob(localJobId: string, outputPath: string): void {
  const existing = jobs.get(localJobId);
  jobs.set(localJobId, {
    status: "completed",
    outputPath,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export function failJob(localJobId: string, error: string): void {
  const existing = jobs.get(localJobId);
  jobs.set(localJobId, {
    status: "failed",
    error,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}
