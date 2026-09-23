import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { TranscriptResult } from "./types.js";

const CACHE_DIR = path.resolve(process.cwd(), process.env.CACHE_DIR ?? "./.cache");

export function hashFile(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function transcriptCachePath(hash: string): string {
  return path.join(CACHE_DIR, "transcripts", `${hash}.json`);
}

function jobIdCachePath(hash: string): string {
  return path.join(CACHE_DIR, "jobs", `${hash}.json`);
}

export function readCachedTranscript(hash: string): TranscriptResult | null {
  const file = transcriptCachePath(hash);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

export function writeCachedTranscript(hash: string, transcript: TranscriptResult): void {
  const file = transcriptCachePath(hash);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(transcript, null, 2));
}

/** Persist the in-flight UniScribe job id so a crashed run can resume polling instead of re-uploading. */
export function readCachedJobId(hash: string): string | null {
  const file = jobIdCachePath(hash);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8")).jobId;
}

export function writeCachedJobId(hash: string, jobId: string): void {
  const file = jobIdCachePath(hash);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ jobId, createdAt: new Date().toISOString() }, null, 2));
}

/**
 * Drops the persisted in-flight job id once its transcript is cached. Without this a
 * failed/timed-out job's id lingers forever, so every later run of the same audio
 * resumes that dead job instead of creating a fresh one.
 */
export function clearCachedJobId(hash: string): void {
  const file = jobIdCachePath(hash);
  if (fs.existsSync(file)) fs.rmSync(file);
}
