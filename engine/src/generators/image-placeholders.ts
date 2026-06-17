/**
 * Favicon and OG image placeholder generators.
 *
 * We can't generate real PNGs in code (no image library, and a 1x1
 * transparent placeholder would actually make things WORSE — browsers
 * would render it broken). Instead, we generate a README that tells
 * the user exactly what to do.
 *
 * This is the "honest stub" pattern: better to say "we don't have
 * this, here's how to get it" than to ship a broken placeholder.
 */

export interface FaviconPlaceholderInput {
  projectName: string;
  /** Framework, to pick the right path */
  framework: string;
}

export function generateFaviconPlaceholder(
  input: FaviconPlaceholderInput
): { path: string; content: string } {
  const targetPath = input.framework === "nextjs" || input.framework === "remix"
    ? "app/favicon.ico"
    : "public/favicon.ico";

  return {
    path: "FAVICON-INSTRUCTIONS.md",
    content: `# Favicon — add a real icon

ShipReady can't generate images, so you'll need to provide a favicon yourself.

## What's needed

A \`favicon.ico\` file at \`${targetPath}\` (32x32 minimum, ideally 64x64 or larger).

## Easiest options (free, 2 minutes)

1. **Use a tool**: https://favicon.io/ — paste your logo, get a full set (favicon, apple-icon, og-image) in one zip.
2. **Use Figma/Canva**: Export a 512x512 square PNG with your logo, then run it through https://realfavicongenerator.net/
3. **Use an emoji**: If you don't have a logo yet, https://favicon.io/emoji-favicons/ generates favicons from a single emoji.

## Where it goes

Move the generated \`favicon.ico\` to: \`${targetPath}\`

For Next.js App Router, also recommended:
- \`app/icon-192.png\` (192x192)
- \`app/icon-512.png\` (512x512)
- \`app/apple-icon.png\` (180x180)
- \`app/opengraph-image.png\` (1200x630)

These are auto-served by Next.js once placed in \`app/\`.

## After adding

Re-run ShipReady to verify the issue is resolved.
`,
  };
}

export function generateOgImagePlaceholder(
  input: FaviconPlaceholderInput
): { path: string; content: string } {
  const targetPath = input.framework === "nextjs" || input.framework === "remix"
    ? "app/opengraph-image.png"
    : "public/og-image.png";

  return {
    path: "OG-IMAGE-INSTRUCTIONS.md",
    content: `# Open Graph image — make your shares look good

The OG image is the 1200x630 image that shows up when your site is shared on Twitter, LinkedIn, Slack, Discord, etc.

## What's needed

A \`opengraph-image.png\` (or \`og-image.png\`) at \`${targetPath}\`, exactly **1200x630 pixels**.

## Easiest options (free)

1. **Use a template**: https://www.opengraph.xyz/ — type your text, get a generated OG image.
2. **Use Figma**: Search "Open Graph Template" in Figma Community, fill in your title/description.
3. **Use Canva**: https://www.canva.com/ — search for "Twitter Post" (1200x630), customize, export as PNG.

## What to include

- **Big title** (your project name, ~80pt)
- **One-line description** (~40pt)
- **Logo or mark** (top-left or bottom-right)
- **Brand colors** for the background

## Where it goes

Save the exported PNG to: \`${targetPath}\`

## After adding

Re-run ShipReady to verify.
`,
  };
}
