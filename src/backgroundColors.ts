/** Named background color presets exposed to the CLI/API/n8n form as the `background` field. */
export const BACKGROUND_COLOR_PRESETS: Record<string, string> = {
  white: "#FFFFFF",
  black: "#000000",
  grey: "#808080",
  silver: "#C0C0C0",
  blue: "#2563EB",
};

export type BackgroundColorName = keyof typeof BACKGROUND_COLOR_PRESETS;

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** True for a 3- or 6-digit hex color, so CSS-invalid values fail here rather than silently rendering nothing. */
export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value.trim());
}

/**
 * Resolves the user-facing `background` value to a CSS color: either one of the
 * named presets, or any explicit hex value (e.g. "#1E88E5") for colors outside
 * the preset list.
 */
export function resolveBackgroundColor(name: string): string {
  const value = name.trim();
  const preset = BACKGROUND_COLOR_PRESETS[value.toLowerCase()];
  if (preset) return preset;
  if (isHexColor(value)) return value;
  throw new Error(
    `Unknown background color "${name}". Use a hex value (e.g. "#1E88E5") or one of: ${Object.keys(BACKGROUND_COLOR_PRESETS).join(", ")}`,
  );
}
