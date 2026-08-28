export const FOLDER_COLORS = [
  { key: "evergreen", name: "Evergreen", value: "#4D7963" },
  { key: "ocean", name: "Ocean", value: "#5A84C3" },
  { key: "violet", name: "Violet", value: "#9876CC" },
  { key: "rose", name: "Rose", value: "#D16D8D" },
  { key: "clay", name: "Clay", value: "#B9856B" },
  { key: "coral", name: "Coral", value: "#D97963" },
  { key: "amber", name: "Amber", value: "#E1A455" },
  { key: "stone", name: "Stone", value: "#9EA3AE" },
] as const;

export type FolderColor = (typeof FOLDER_COLORS)[number]["value"];
export const DEFAULT_FOLDER_COLOR = FOLDER_COLORS[0].value;

export function getFolderColor(color?: string) {
  return color || DEFAULT_FOLDER_COLOR;
}

function normalizeHex(hex: string) {
  const sanitized = hex.replace("#", "");
  if (sanitized.length === 3) {
    return sanitized
      .split("")
      .map((char) => char + char)
      .join("");
  }
  return sanitized;
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex);
  const value = Number.parseInt(normalized, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function srgbToLinear(value: number) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function clamp(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function toHex(value: number) {
  return clamp(value).toString(16).padStart(2, "0");
}

export function mixColors(baseHex: string, targetHex: string, amount: number) {
  const base = hexToRgb(baseHex);
  const target = hexToRgb(targetHex);
  const ratio = Math.max(0, Math.min(1, amount));

  return `#${toHex(base.r + (target.r - base.r) * ratio)}${toHex(
    base.g + (target.g - base.g) * ratio
  )}${toHex(base.b + (target.b - base.b) * ratio)}`;
}

export function withAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  const normalizedAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${normalizedAlpha})`;
}

export function getFolderTone(color?: string) {
  const base = getFolderColor(color);

  return {
    base,
    dark: mixColors(base, "#1f2937", 0.28),
    light: mixColors(base, "#ffffff", 0.2),
    soft: mixColors(base, "#ffffff", 0.82),
    border: mixColors(base, "#cbd5e1", 0.35),
  };
}

export function getContrastTextColor(color?: string) {
  const base = getFolderColor(color);
  const { r, g, b } = hexToRgb(base);
  const luminance =
    0.2126 * srgbToLinear(r) +
    0.7152 * srgbToLinear(g) +
    0.0722 * srgbToLinear(b);

  return luminance > 0.34 ? "#0f172a" : "#ffffff";
}

export function getBannerTextPalette(color?: string) {
  const text = getContrastTextColor(color);
  const isDarkText = text === "#0f172a";

  return {
    title: text,
    muted: isDarkText ? "rgba(15, 23, 42, 0.78)" : "rgba(255, 255, 255, 0.9)",
    subtle: isDarkText ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.72)",
    badgeBg: isDarkText ? "rgba(255, 255, 255, 0.28)" : "rgba(15, 23, 42, 0.2)",
    badgeBorder: isDarkText ? "rgba(15, 23, 42, 0.16)" : "rgba(255, 255, 255, 0.18)",
    shadow: isDarkText
      ? "0 1px 1px rgba(255,255,255,0.14)"
      : "0 1px 12px rgba(0,0,0,0.28)",
  };
}