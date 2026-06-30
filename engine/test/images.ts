// Image generator smoke test — verifies generateRealImages produces real PNG buffers
// with correct dimensions, valid PNG headers, and non-blank content.
import sharp from "sharp";
import { generateRealImages } from "../src/generators/images";

let pass = 0, fail = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    pass++;
    console.log(`  [OK] ${label}`);
  } else {
    fail++;
    console.log(`  [FAIL] ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("=== Image Generator ===\n");

// ── Basic: 5 images produced with correct paths ──
console.log("--- Basic generation (5 images, default brand color) ---");
const images = await generateRealImages({ projectName: "TestProject" });

assert(images.length === 5, `Produced ${images.length} images (expected 5)`);

const EXPECTED_PATHS: Record<string, { width: number; height: number }> = {
  "public/favicon.png":         { width: 32,   height: 32 },
  "public/apple-icon.png":      { width: 180,  height: 180 },
  "public/icon-192.png":        { width: 192,  height: 192 },
  "public/icon-512.png":        { width: 512,  height: 512 },
  "public/opengraph-image.png": { width: 1200, height: 630 },
};

for (const img of images) {
  const expected = EXPECTED_PATHS[img.path];
  assert(expected !== undefined, `Path "${img.path}" is one of the 5 expected paths`);
  assert(Buffer.isBuffer(img.content), `${img.path} content is a Buffer`);
  assert(typeof img.description === "string" && img.description.length > 0, `${img.path} has a description`);
}

console.log("");

// ── PNG header validation ──
console.log("--- PNG header / dimensions ---");
const PNG_HEADER = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]); // magic bytes

for (const img of images) {
  const expected = EXPECTED_PATHS[img.path];
  const headerOk = img.content.subarray(0, 8).equals(PNG_HEADER);
  assert(headerOk, `${img.path} starts with valid PNG header`);

  // Verify dimensions via sharp
  const meta = await sharp(img.content).metadata();
  assert(meta.format === "png", `${img.path} sharp detects format as PNG`);
  assert(meta.width === expected.width, `${img.path} width = ${meta.width} (expected ${expected.width})`);
  assert(meta.height === expected.height, `${img.path} height = ${meta.height} (expected ${expected.height})`);
}

console.log("");

// ── Non-blank check ──
console.log("--- Non-blank images (have pixel variation from drawn text) ---");
for (const img of images) {
  const stats = await sharp(img.content).stats();
  const nonBlank = stats.channels.some((c) => c.stdev > 1);
  assert(nonBlank, `${img.path} has pixel variation (stdev > 1 in at least one channel)`);
}

console.log("");

// ── Custom brand color ──
console.log("--- Custom brand color ---");
const colored = await generateRealImages({
  projectName: "ColorTest",
  brandColor: "#ff6600",
});

const meta0 = await sharp(colored[0].content).metadata();
assert(meta0.format === "png", "Colored favicon is PNG");
assert(colored.length === 5, "Colored version also produces 5 images");

// Verify the color is used — check the first pixel isn't pure black/white
const faviconStats = await sharp(colored[0].content).stats();
const meanR = faviconStats.channels[0].mean;
const meanG = faviconStats.channels[1].mean;
const meanB = faviconStats.channels[2].mean;
// With #ff6600 brand color, R should be dominant
assert(meanR > meanG && meanR > meanB, "Colored favicon has red-ish tint from #ff6600");

console.log("");

// ── Initials extraction ──
console.log("--- Project name initials ---");
const multiWord = await generateRealImages({ projectName: "My Awesome Project" });
// "M" and "A" and "P" → "MAP" (first 3 chars)
// We can't easily verify the rendered text, but we verify the image is non-blank
const multiStats = await sharp(multiWord[0].content).stats();
assert(multiStats.channels.some((c) => c.stdev > 1), "Multi-word project image has pixel variation");

console.log("");

// ── Summary ──
console.log(`---`);
console.log(`${pass} pass, ${fail} fail\n`);
if (fail > 0) process.exit(1);
