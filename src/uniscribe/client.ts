import fs from "node:fs";
import path from "node:path";
import {
  ApiAccessDeniedError,
  EmptyTranscriptError,
  InvalidApiKeyError,
  PipelineError,
  RateLimitError,
  TranscriptionFailedError,
  TranscriptionTimeoutError,
  UnsupportedFormatError,
} from "../errors.js";
import { stageLogger } from "../logger.js";

const log = stageLogger("uniscribe");

const SUPPORTED_EXTENSIONS = new Set([
  ".mp3",
  ".mpeg",
  ".mpga",
  ".m4a",
  ".wav",
  ".aac",
  ".ogg",
  ".opus",
  ".flac",
  ".mp4",
  ".webm",
  ".mov",
]);

export interface UniScribeWord {
  start: number;
  end: number;
  text: string;
}

export interface UniScribeSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
  words?: UniScribeWord[];
}

export interface UniScribeTranscriptionResult {
  text: string;
  summary?: string;
  outline?: string;
  language?: string;
  segments: UniScribeSegment[];
}

export interface UniScribeTranscription {
  id: string;
  filename: string;
  status: "queued" | "preprocessing" | "processing" | "completed" | "failed";
  duration?: number;
  language_code?: string;
  transcription_type?: string;
  created_at: string;
  completed_at?: string;
  error_message?: string | null;
  result?: UniScribeTranscriptionResult;
}

interface UniScribeClientOptions {
  apiKey: string;
  baseUrl?: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message: string; code: number; details?: string };
}

export class UniScribeClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: UniScribeClientOptions) {
    if (!options.apiKey) {
      throw new InvalidApiKeyError("UNISCRIBE_API_KEY is not set");
    }
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "https://api.uniscribe.co";
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "X-API-Key": this.apiKey,
        ...(init.headers ?? {}),
      },
    });

    let body: ApiEnvelope<T> | undefined;
    try {
      body = (await res.json()) as ApiEnvelope<T>;
    } catch {
      // non-JSON body (e.g. gateway error page)
    }

    if (res.status === 401) throw new InvalidApiKeyError(body?.error?.message);
    if (res.status === 403 && body?.error?.code === 41000) throw new ApiAccessDeniedError(body?.error?.message);
    if (res.status === 429) {
      const retryAfter = res.headers.get("retry-after");
      throw new RateLimitError(retryAfter ? Number(retryAfter) : undefined);
    }
    if (!res.ok || body?.success === false) {
      throw new PipelineError(
        "transcription",
        `UniScribe API error (${res.status}): ${body?.error?.message ?? res.statusText}`,
      );
    }
    return body!.data as T;
  }

  /** Step 1+2: request a pre-signed upload URL, then PUT the file bytes directly to storage. */
  async uploadFile(filePath: string): Promise<{ fileKey: string }> {
    const ext = path.extname(filePath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      throw new UnsupportedFormatError(ext);
    }

    const filename = path.basename(filePath);
    const fileSize = fs.statSync(filePath).size;

    log.info({ filename, fileSize }, "requesting upload URL");
    const { upload_url, file_key } = await this.request<{ upload_url: string; file_key: string }>(
      "/api/v1/files/upload-url",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, file_size: fileSize }),
      },
    );

    log.info({ filename }, "uploading file to storage");
    const fileBuffer = fs.readFileSync(filePath);
    const putRes = await fetch(upload_url, { method: "PUT", body: fileBuffer });
    if (!putRes.ok) {
      throw new PipelineError("transcription", `Upload to storage failed (${putRes.status}): ${putRes.statusText}`);
    }

    return { fileKey: file_key };
  }

  /** Step 3: create the transcription job from an uploaded file_key. */
  async createTranscription(params: {
    fileKey: string;
    filename: string;
    languageCode: string;
    transcriptionType?: "transcript" | "subtitle";
    enableSpeakerDiarization?: boolean;
    webhookUrl?: string;
  }): Promise<{ id: string }> {
    log.info({ filename: params.filename }, "creating transcription job");
    return this.request<{ id: string }>("/api/v1/transcriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_key: params.fileKey,
        filename: params.filename,
        language_code: params.languageCode,
        transcription_type: params.transcriptionType ?? "transcript",
        enable_speaker_diarization: params.enableSpeakerDiarization ?? false,
        ...(params.webhookUrl ? { webhook_url: params.webhookUrl } : {}),
      }),
    });
  }

  async listTranscriptions(params: { limit?: number; cursor?: string } = {}): Promise<{
    items: UniScribeTranscription[];
    has_more: boolean;
    next_cursor?: string;
  }> {
    const query = new URLSearchParams();
    if (params.limit) query.set("limit", String(params.limit));
    if (params.cursor) query.set("cursor", params.cursor);
    const qs = query.toString();
    return this.request(`/api/v1/transcriptions${qs ? `?${qs}` : ""}`);
  }

  async getStatus(jobId: string): Promise<{ status: UniScribeTranscription["status"]; error_message?: string | null }> {
    return this.request(`/api/v1/transcriptions/${jobId}/status`);
  }

  async getTranscription(jobId: string): Promise<UniScribeTranscription> {
    return this.request(`/api/v1/transcriptions/${jobId}`);
  }

  /** Poll until the job reaches a terminal state. Prefer the webhook path when available (see webhook.ts). */
  async pollUntilComplete(jobId: string, opts: { intervalMs: number; timeoutMs: number }): Promise<UniScribeTranscription> {
    const deadline = Date.now() + opts.timeoutMs;
    while (Date.now() < deadline) {
      const { status, error_message } = await this.getStatus(jobId);
      log.info({ jobId, status }, "poll");
      if (status === "completed") {
        const full = await this.getTranscription(jobId);
        if (!full.result || !full.result.segments?.length) {
          throw new EmptyTranscriptError(jobId);
        }
        return full;
      }
      if (status === "failed") {
        throw new TranscriptionFailedError(jobId, error_message ?? undefined);
      }
      await new Promise((r) => setTimeout(r, opts.intervalMs));
    }
    throw new TranscriptionTimeoutError(jobId, opts.timeoutMs);
  }
}
