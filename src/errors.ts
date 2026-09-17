export class PipelineError extends Error {
  /** exit code the CLI should use when this error escapes to the top level */
  readonly exitCode: number;
  readonly stage: string;

  constructor(stage: string, message: string, exitCode = 1) {
    super(message);
    this.name = new.target.name;
    this.stage = stage;
    this.exitCode = exitCode;
  }
}

export class InvalidApiKeyError extends PipelineError {
  constructor(details?: string) {
    super(
      "transcription",
      `UniScribe API key is invalid or missing. Set UNISCRIBE_API_KEY in your .env file.${
        details ? ` (${details})` : ""
      }`,
      2,
    );
  }
}

export class ApiAccessDeniedError extends PipelineError {
  constructor(details?: string) {
    super(
      "transcription",
      `UniScribe API access denied — this endpoint requires an active Basic-tier (or higher) subscription. Check your plan at uniscribe.co.${
        details ? ` (${details})` : ""
      }`,
      2,
    );
  }
}

export class RateLimitError extends PipelineError {
  constructor(retryAfterSec?: number) {
    super(
      "transcription",
      `UniScribe API rate limit exceeded (60 req/min, 1000 req/day).${
        retryAfterSec ? ` Retry after ${retryAfterSec}s.` : " Back off and retry."
      }`,
      3,
    );
  }
}

export class UnsupportedFormatError extends PipelineError {
  constructor(ext: string) {
    super(
      "transcription",
      `Unsupported audio/video format "${ext}". UniScribe accepts: mp3, mpeg, mpga, m4a, wav, aac, ogg, opus, flac, mp4, webm, mov.`,
      4,
    );
  }
}

export class EmptyTranscriptError extends PipelineError {
  constructor(jobId: string) {
    super("transcription", `Transcription ${jobId} completed but returned no text/segments.`, 5);
  }
}

export class TranscriptionFailedError extends PipelineError {
  constructor(jobId: string, reason?: string) {
    super("transcription", `UniScribe transcription ${jobId} failed.${reason ? ` Reason: ${reason}` : ""}`, 6);
  }
}

export class TranscriptionTimeoutError extends PipelineError {
  constructor(jobId: string, timeoutMs: number) {
    super("transcription", `Timed out after ${timeoutMs}ms waiting for transcription ${jobId} to complete.`, 7);
  }
}

export class RenderError extends PipelineError {
  constructor(message: string) {
    super("render", `Render failed: ${message}`, 8);
  }
}

export class ConfigError extends PipelineError {
  constructor(message: string) {
    super("config", `Configuration error: ${message}`, 9);
  }
}
