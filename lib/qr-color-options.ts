export const QR_COLOR_OPTIONS = [
  { label: "PB Blue", value: "#2C00AB" },
  { label: "Black", value: "#000000" },
  { label: "White", value: "#FFFFFF" },
] as const;

export type QrColorHex = (typeof QR_COLOR_OPTIONS)[number]["value"];

const QR_COLOR_SET = new Set<string>(QR_COLOR_OPTIONS.map((option) => option.value));

export function normalizeQrColor(value: string) {
  const normalized = value.trim().toUpperCase();

  if (!QR_COLOR_SET.has(normalized)) {
    throw new Error("Color must be one of: PB Blue (#2C00AB), Black (#000000), White (#FFFFFF).");
  }

  return normalized as QrColorHex;
}
