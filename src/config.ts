import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { ConfigError } from "./errors.js";
import type { PipelineConfig } from "./types.js";
import { COLOR_THEMES, STYLE_DEFAULT_THEME, THEME_NAMES } from "./themes.js";

const configSchema = z.object({
  output: z.object({
    orientation: z.enum(["vertical", "horizontal"]),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    fps: z.number().int().positive(),
    directory: z.string().min(1),
  }),
  theme: z.enum(THEME_NAMES as [string, ...string[]]).nullable(),
  reveal: z.object({
    style: z.enum(["focus-word", "clean-feed", "vertical-show", "orbit"]),
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
  const overrideSources: Record<string, any>[] = [];

  if (overridePath) {
    const resolved = path.resolve(process.cwd(), overridePath);
    if (!fs.existsSync(resolved)) {
      throw new ConfigError(`Config override file not found: ${resolved}`);
    }
    const overrideText = fs.readFileSync(resolved, "utf-8");
    const override = resolved.endsWith(".json") ? JSON.parse(overrideText) : parseYaml(overrideText);
    overrideSources.push(override);
    merged = deepMerge(merged, override);
  }

  if (inlineOverrides) {
    overrideSources.push(inlineOverrides);
    merged = deepMerge(merged, inlineOverrides);
  }

  // Keep width/height in sync with a changed orientation, unless the caller set
  // explicit dimensions. Checking only "was any output override given" misses the
  // common case of overriding *just* orientation (e.g. configOverrides: {output:
  // {orientation: "horizontal"}}), which would otherwise keep the default vertical
  // 1080x1920 frame while claiming to be horizontal.
  const explicitlySet = (key: "width" | "height") => overrideSources.some((s) => s?.output?.[key] !== undefined);
  if (merged.output?.orientation === "horizontal" && !explicitlySet("width") && !explicitlySet("height")) {
    merged.output.width = 1920;
    merged.output.height = 1080;
  } else if (merged.output?.orientation === "vertical" && !explicitlySet("width") && !explicitlySet("height")) {
    merged.output.width = 1080;
    merged.output.height = 1920;
  }

  const parsed = configSchema.safeParse(merged);
  if (!parsed.success) {
    throw new ConfigError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  return applyTheme(parsed.data as PipelineConfig, overrideSources);
}

/**
 * Fills background/text/highlight colors from the chosen theme (or, with none chosen,
 * the style's default theme). A color set explicitly by any override — a config file,
 * configOverrides, or the fontColor/background/... request fields — always wins over
 * the theme, so a theme can be picked and then individually adjusted.
 */
function applyTheme(config: PipelineConfig, overrideSources: Record<string, any>[]): PipelineConfig {
  const themeName = config.theme ?? STYLE_DEFAULT_THEME[config.reveal.style];
  const theme = COLOR_THEMES[themeName as keyof typeof COLOR_THEMES];
  const isSet = (get: (s: any) => unknown) => overrideSources.some((s) => get(s) !== undefined);

  return {
    ...config,
    theme: themeName,
    background: {
      ...config.background,
      color: isSet((s) => s?.background?.color) ? config.background.color : theme.background,
      waveform: {
        ...config.background.waveform,
        color: isSet((s) => s?.background?.waveform?.color) ? config.background.waveform.color : theme.highlight,
      },
    },
    text: {
      ...config.text,
      color: isSet((s) => s?.text?.color) ? config.text.color : theme.text,
      highlightColor: isSet((s) => s?.text?.highlightColor) ? config.text.highlightColor : theme.highlight,
    },
  };
}
