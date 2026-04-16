#!/usr/bin/env bun
import { ThumbnailGenerator } from "./lib";
import { parseArgs } from "util";
import ora from "ora";
import fs from "fs-extra";
import { logger } from "./logger";

const VERSION = "1.0.0";

let currentTempDir: string | null = null;
let isShuttingDown = false;

async function cleanup(): Promise<void> {
  if (currentTempDir) {
    try {
      await fs.remove(currentTempDir);
      logger.debug(`Cleaned up temp directory: ${currentTempDir}`);
    } catch (error) {
      logger.warn(`Failed to clean up temp directory: ${error}`);
    }
    currentTempDir = null;
  }
}

function shutdown(signal: string): void {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.warn(`Received ${signal}, shutting down...`);
  cleanup().then(() => {
    const exitCode = signal === "SIGINT" ? 130 : 1;
    process.exit(exitCode);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

const parsed = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    input: { type: "string", short: "i" },
    output: { type: "string", short: "o" },
    cols: { type: "string", short: "c", default: "5" },
    rows: { type: "string", short: "r", default: "5" },
    width: { type: "string", short: "w", default: "320" },
    height: { type: "string", short: "h", default: "180" },
    format: { type: "string", short: "f", default: "png" },
    quality: { type: "string", short: "q", default: "80" },
    "no-overlay": { type: "boolean", default: false },
    force: { type: "boolean", short: "F", default: false },
    verbose: { type: "boolean", short: "v", default: false },
    version: { type: "boolean", short: "V", default: false },
    help: { type: "boolean", short: "?" },
  },
});

if (parsed.values.version) {
  console.log(`thumbgrid v${VERSION}`);
  process.exit(0);
}

if (parsed.values.help) {
  console.log(`Usage: thumbgrid [options]

Options:
  -i, --input <path>     Input video file (required)
  -o, --output <path>    Output image path (optional, auto-generated if not set)
  -c, --cols <n>        Number of columns (default: 5)
  -r, --rows <n>        Number of rows (default: 5)
  -w, --width <px>      Frame width (default: 320)
  -h, --height <px>     Frame height (default: 180)
  -f, --format <fmt>    Output format: png or jpg (default: png)
  -q, --quality <n>     Output quality 1-100 (default: 80)
  -F, --force           Force overwrite if output exists
  -v, --verbose         Enable verbose logging
  --no-overlay          Disable metadata overlay
  -V, --version         Show version
  -?, --help            Show this help
`);
  process.exit(0);
}

const verbose = parsed.values.verbose as boolean;
if (verbose) {
  logger.setLevel("debug");
}

const input = parsed.values.input as string | undefined;
if (!input) {
  logger.error("Error: --input is required");
  process.exit(1);
}

const force = parsed.values.force as boolean;
const outputPath = parsed.values.output as string | undefined;
if (outputPath && !force) {
  const exists = await fs.pathExists(outputPath);
  if (exists) {
    logger.error(`Error: Output file already exists: ${outputPath}. Use --force to overwrite.`);
    process.exit(1);
  }
}

const generator = new ThumbnailGenerator({
  cols: parseInt(parsed.values.cols as string || "5"),
  rows: parseInt(parsed.values.rows as string || "5"),
  frameWidth: parseInt(parsed.values.width as string || "320"),
  frameHeight: parseInt(parsed.values.height as string || "180"),
  outputFormat: (parsed.values.format as string || "png") as "png" | "jpg",
  quality: parseInt(parsed.values.quality as string || "80"),
  showOverlay: !parsed.values["no-overlay"],
});

const spinner = ora("Generating thumbnail...").start();

if (verbose) {
  logger.debug(`Input: ${input}`);
  logger.debug(`Options: cols=${generator["options"].cols}, rows=${generator["options"].rows}`);
}

try {
  const result = await generator.generate(input, outputPath);

  spinner.succeed(`Generated: ${result.outputPath}`);
  console.log(`  Frames: ${result.cols}x${result.rows} = ${result.frameCount}`);
  console.log(`  Metadata: ${result.metadata.filename} | ${result.metadata.size} | ${result.metadata.resolution} | ${result.metadata.playtime}`);

  process.exit(0);
} catch (err) {
  spinner.fail(`Failed: ${err}`);
  if (verbose && err instanceof Error) {
    logger.error(err.stack || err.message);
  }
  process.exit(1);
}