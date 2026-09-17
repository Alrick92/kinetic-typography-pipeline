import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { ConfigError } from "./errors.js";
import type { PipelineConfig } from "./types.js";

const configSchema = z.object({
  output: z.object({
    orientation: z.enum(["vertical", "horizontal"]),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    fps: z.number().int().positive(),
    directory: z.string().min(1),
  }),
  reveal: z.object({
    style: z.enum(["word-pop", "karaoke", "focus-word", "clean-feed", "lyrics-scroll", "quote-card", "vertical-show", "orbit"]),
  }),
  text: z.object({
    font: z.string().min(1),
    fontSize: z.number().int().positive(),
    color: z.string().min(1),
    highlightColor: z.string().min(1),
    strokeColor: z.string().min(1),
    strokeWidth: z.number().nonnegative(),
    position: z.enum(["center", "lower-third"]),
  }),
  background: z.object({
    type: z.enum(["solid", "gradient", "video", "waveform"]),
    color: z.string().min(1),
    gradient: z.object({ from: z.string(), to: z.string(), angle: z.number() }),
    mediaPath: z.string().nullable(),
    videoLoopSec: z.number().positive(),
    waveform: z.object({ color: z.string(), style: z.literal("bars") }),
  }),
  uniscribe: z.object({
    pollIntervalMs: z.number().int().positive(),
    pollTimeoutMs: z.number().int().positive(),
  }),
  show: z.object({
    title: z.string().nullable(),
    coverImagePath: z.string().nullable(),
    description: z.string().nullable(),
    episodeLabel: z.string().nullable(),
    totalChapters: z.number().int().positive(),
  }),
});

export function deepMerge<T>(base: T, override: Partial<T>): T {
  const result: any = Array.isArray(base) ? [...(base as any)] : { ...base };
  for (const [key, value] of Object.entries(override ?? {})) {
    if (value && typeof value === "object" && !Array.isArray(value) && typeof result[key] === "object") {
      result[key] = deepMerge(result[key], value as any);
    } else if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

const DEFAULT_CONFIG_PATH = path.resolve(process.cwd(), "config/default.yaml");

export function loadConfig(overridePath?: string, inlineOverrides?: Record<string, unknown>): PipelineConfig {
  if (!fs.existsSync(DEFAULT_CONFIG_PATH)) {
    throw new ConfigError(`Default config not found at ${DEFAULT_CONFIG_PATH}`);
  }

  let merged = parseYaml(fs.readFileSync(DEFAULT_CONFIG_PATH, "utf-8"));

  if (overridePath) {
    const resolved = path.resolve(process.cwd(), overridePath);
    if (!fs.existsSync(resolved)) {
      throw new ConfigError(`Config override file not found: ${resolved}`);
    }
    const overrideText = fs.readFileSync(resolved, "utf-8");
    const override = resolved.endsWith(".json") ? JSON.parse(overrideText) : parseYaml(overrideText);
    merged = deepMerge(merged, override);
  }

  if (inlineOverrides) {
    merged = deepMerge(merged, inlineOverrides);
  }

  // Keep width/height in sync with orientation unless explicitly overridden.
  if (merged.output?.orientation === "horizontal" && !inlineOverrides?.output && !overridePath) {
    merged.output.width = 1920;
    merged.output.height = 1080;
  }

  const parsed = configSchema.safeParse(merged);
  if (!parsed.success) {
    throw new ConfigError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  return parsed.data;
}
