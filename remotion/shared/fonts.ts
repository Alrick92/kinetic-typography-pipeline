import { loadFont as loadSpaceGrotesk, fontFamily as spaceGroteskFamily } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadBodoniModa, fontFamily as bodoniModaFamily } from "@remotion/google-fonts/BodoniModa";
import { loadFont as loadDMMono, fontFamily as dmMonoFamily } from "@remotion/google-fonts/DMMono";

// Registers the @font-face rules once when this module is first imported.
loadSpaceGrotesk("normal", { weights: ["500", "600", "700"], subsets: ["latin"] });
loadBodoniModa("normal", { weights: ["400"], subsets: ["latin", "latin-ext"] });
loadDMMono("normal", { weights: ["400"], subsets: ["latin"] });

/** Fixed typefaces of the quote-card style (part of its look, not driven by text.font). */
export const QUOTE_SERIF_FAMILY = bodoniModaFamily;
export const LABEL_MONO_FAMILY = dmMonoFamily;

/**
 * Resolves a configured font name to a CSS font-family string. "Space Grotesk" (the
 * default in config/default.yaml) resolves to the actual loaded webfont, so it
 * renders correctly in headless Chrome even when the OS has no such font installed.
 * Any other configured name falls back to a system-font stack — see the README's
 * "Extending" section if you want to wire up another Google Font the same way.
 */
export function resolveFontFamily(configuredFont: string): string {
  if (configuredFont.trim().toLowerCase() === "space grotesk") {
    return spaceGroteskFamily;
  }
  return `${configuredFont}, -apple-system, "Segoe UI", Roboto, sans-serif`;
}
