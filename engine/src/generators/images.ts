/**
 * Real image generator for favicon, OG image, and PWA icons.
 *
 * Creates PNG images using sharp's create() API with raw pixel data.
 * No SVG — no font rendering issues. Instead, we draw colored backgrounds
 * with project initials encoded as simple pixel patterns.
 *
 * Approach: sharp create() with raw pixel data for the background,
 * then overlay text using sharp's built-in SVG text support
 * (which works for simple short strings when using system fonts).
 *
 * Files generated:
 *  - public/favicon.png          (32x32)
 *  - public/apple-icon.png      (180x180)
 *  - public/icon-192.png         (192x192, PWA)
 *  - public public/icon-512.png (512x512, PWA)
 *  - public/opengraph-image.png  (1200x630)
 *
 * Fallback: If text overlay fails, we generate a solid-color placeholder
 * with the brand color. The user gets a usable image even if initials
 * don't render — better than a blank/transparent image.
 */

import sharp from "sharp";
import type { CodebaseContext } from "../types";

export interface ImageGeneratorInput {
  projectName: string;
  brandColor?: string;
  codebase?: CodebaseContext;
}

export interface GeneratedImage {
  path: string;
  content: Buffer;
  description: string;
}

function pickBrandColor(input: ImageGeneratorInput): string {
  // Explicit user override — return as-is (user chose it intentionally)
  if (input.brandColor) return input.brandColor;
  // Inferred from codebase — guard against light/washed-out colors
  if (input.codebase?.brandColor) return ensureDarkEnough(input.codebase.brandColor);
  // Derived from project name hash — already guarded inside nameToBrandColor
  return nameToBrandColor(input.projectName);
}

function nameToBrandColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(h) % 360;
  // Use darker/richer tones: 75% saturation, 40% lightness
  // This ensures the background is always visibly colored, never washed out.
  const hex = hslToHex(hue, 0.75, 0.40);
  return ensureDarkEnough(hex);
}

/**
 * Ensure a hex color is dark enough to be visible as a favicon background.
 * If the color is too light (all channels > 200), darken it to a medium tone.
 */
function ensureDarkEnough(hex: string): string {
  const rgb = hexToRgb(hex);
  // If all channels are > 200, the color is too light — darken to a medium shade
  if (rgb.r > 200 && rgb.g > 200 && rgb.b > 200) {
    return "#6366f1"; // Indigo — always visible
  }
  // If average brightness > 180, scale it down
  const avg = (rgb.r + rgb.g + rgb.b) / 3;
  if (avg > 180) {
    const factor = 140 / avg;
    const darken = (c: number) => Math.round(Math.min(c * factor, 200));
    const toHex = (c: number) => Math.min(c, 255).toString(16).padStart(2, "0");
    return "#" + toHex(darken(rgb.r)) + toHex(darken(rgb.g)) + toHex(darken(rgb.b));
  }
  return hex;
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 1;
  l /= 1;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) =>
    Math.round(255 * f(x)).toString(16).padStart(2, "0");
  return `#${toHex(0)}${toHex(8)}${toHex(4)}`;
}

function getInitials(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z\s]/g, "");
  const parts = cleaned.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SR";
  const initials = parts
    .map((p) => p.charAt(0).toUpperCase())
    .filter(Boolean)
    .join("");
  return initials.slice(0, 3);
}

/**
 * Parse a hex color string to {r, g, b} with values 0-255.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

/**
 * Create a solid-color PNG image of the given dimensions.
 * This is the reliable fallback that always produces a visible image.
 */
async function createSolidImage(
  width: number,
  height: number,
  brandColor: string
): Promise<Buffer> {
  const { r, g, b } = hexToRgb(brandColor);
  const channels = 4; // RGBA
  const pixelData = Buffer.alloc(width * height * channels);

  for (let i = 0; i < width * height; i++) {
    pixelData[i * channels + 0] = r;
    pixelData[i * channels + 1] = g;
    pixelData[i * channels + 2] = b;
    pixelData[i * channels + 3] = 255; // fully opaque
  }

  return await sharp(pixelData, {
    raw: { width, height, channels },
  })
    .png()
    .toBuffer();
}

/**
 * Draw initials on a solid-color image using sharp's SVG composite.
 *
 * sharp.composite() accepts SVG input, and while sharp's SVG renderer
 * can't handle <text> in some environments, we try it first with a
 * simple SVG. If the resulting image has the same pixel count as the
 * background (meaning text didn't render), we fall back to creating
 * a simple geometric initial marker instead.
 */
async function createImageWithInitials(
  width: number,
  height: number,
  brandColor: string,
  initials: string,
  isWide: boolean,
  projectName?: string
): Promise<Buffer> {
  const { r, g, b } = hexToRgb(brandColor);

  // Create the solid background
  const channels = 4;
  const pixelData = Buffer.alloc(width * height * channels);
  for (let i = 0; i < width * height; i++) {
    pixelData[i * channels + 0] = r;
    pixelData[i * channels + 1] = g;
    pixelData[i * channels + 2] = b;
    pixelData[i * channels + 3] = 255;
  }

  const baseImg = sharp(pixelData, { raw: { width, height, channels } });

  // Create an SVG overlay with the initials drawn as text
  const fontSize = isWide ? Math.round(height * 0.24) : Math.round(width * 0.42);
  const svgText = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<text x="${width / 2}" y="${height / 2 + fontSize * 0.35}" ` +
    `text-anchor="middle" font-family="Arial,Helvetica,sans-serif" ` +
    `font-size="${fontSize}" font-weight="bold" fill="#ffffff">${initials}</text>` +
    (isWide ? `<text x="${width / 2}" y="${height * 0.76}" text-anchor="middle" ` +
    `font-family="Arial,Helvetica,sans-serif" font-size="${Math.round(fontSize * 0.37)}" ` +
    `fill="#ffffff">${width > 500 ? (projectName || "") : ""}</text>` : "") +
    `</svg>`
  );

  try {
    // Composite the SVG text onto the background
    const result = await baseImg
      .composite([{ input: svgText, top: 0, left: 0 }])
      .png()
      .toBuffer();

    // Verify the image isn't blank — check that we have more than just 5 unique values
    // (a solid-color image has ~5 unique RGBA values due to PNG compression)
    const stats = await sharp(result).stats();
    // If all channels have near-zero standard deviation, the image is solid
    // which means the text didn't render. Fall back to a geometric marker.
    const isBlank =
      stats.channels.every((c) => c.stdev < 1);

    if (!isBlank) {
      return result;
    }
    // Text didn't render — fall through to geometric approach
  } catch {
    // SVG composite failed — fall through to geometric approach
  }

  // Fallback: Create an image with a simple geometric initial marker
  // We draw a lighter circle in the center to at least show something
  const markerSize = isWide ? height * 0.3 : width * 0.6;
  const lightColor = `rgba(${Math.min(r + 40, 255)},${Math.min(g + 40, 255)},${Math.min(b + 40, 255)},1)`;
  const markerSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<circle cx="${width / 2}" cy="${height / 2}" r="${markerSize / 2}" fill="${lightColor}" opacity="0.3"/>` +
    `<text x="${width / 2}" y="${height / 2 + fontSize * 0.35}" ` +
    `text-anchor="middle" font-family="Arial,sans-serif" ` +
    `font-size="${fontSize}" font-weight="bold" fill="#ffffff">${initials}</text>` +
    `</svg>`
  );

  // Recreate base (previous attempt consumed the sharp instance)
  const baseImg2 = sharp(Buffer.from(pixelData), {
    raw: { width, height, channels },
  });

  try {
    return await baseImg2
      .composite([{ input: markerSvg, top: 0, left: 0 }])
      .png()
      .toBuffer();
  } catch {
    // Final fallback: just return the solid color image
    return await createSolidImage(width, height, brandColor);
  }
}

/** Generate all 5 images for a project */
export async function generateRealImages(
  input: ImageGeneratorInput
): Promise<GeneratedImage[]> {
  const brandColor = pickBrandColor(input);
  const initials = getInitials(input.projectName);
  const projectName = input.projectName;

  const results: GeneratedImage[] = await Promise.all([
    createImageWithInitials(32, 32, brandColor, initials, false, projectName).then(
      (buf) => ({
        path: "public/favicon.png",
        content: buf,
        description: "Favicon (32x32 PNG)",
      })
    ),
    createImageWithInitials(180, 180, brandColor, initials, false, projectName).then(
      (buf) => ({
        path: "public/apple-icon.png",
        content: buf,
        description: "Apple touch icon (180x180 PNG)",
      })
    ),
    createImageWithInitials(192, 192, brandColor, initials, false, projectName).then(
      (buf) => ({
        path: "public/icon-192.png",
        content: buf,
        description: "PWA icon 192x192 PNG",
      })
    ),
    createImageWithInitials(512, 512, brandColor, initials, false, projectName).then(
      (buf) => ({
        path: "public/icon-512.png",
        content: buf,
        description: "PWA icon 512x512 PNG",
      })
    ),
    createImageWithInitials(1200, 630, brandColor, initials, true, projectName).then(
      (buf) => ({
        path: "public/opengraph-image.png",
        content: buf,
        description: "Open Graph image (1200x630 PNG)",
      })
    ),
  ]);

  return results;
}

export { pickBrandColor, nameToBrandColor, getInitials };
