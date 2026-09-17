/** Named background color presets exposed to the CLI/API/n8n form as the `background` field. */
export const BACKGROUND_COLOR_PRESETS: Record<string, string> = {
  white: "#FFFFFF",
  black: "#000000",
  grey: "#808080",
  silver: "#C0C0C0",
  blue: "#2563EB",
};

export type BackgroundColorName = keyof typeof BACKGROUND_COLOR_PRESETS;

export function resolveBackgroundColor(name: string): string {
  const hex = BACKGROUND_COLOR_PRESETS[name.toLowerCase()];
  if (!hex) {
    throw new Error(
      `Unknown background color "${name}". Valid options: ${Object.keys(BACKGROUND_COLOR_PRESETS).join(", ")}`,
    );
  }
  return hex;
}
