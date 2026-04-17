#!/usr/bin/env bun
import { ThumbnailGenerator } from "../core";
import { parseArgs } from "node:util";
import ora from "ora";
import fs from "fs-extra";
import { logger } from "../utils/logger";

const VERSION = "1.0.0";

interface CliArgs {
  version?: boolean;
  help?: boolean;
  verbose?: boolean;
  input?: string;
  output?: string;
  format?: string;
  cols?: string;
  rows?: string;
  width?: string;
  height?: string;
  quality?: string;
  force?: boolean;
  "no-overlay"?: boolean;
}

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
  if (isShuttingDown) {
    return;
  }
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
    cols: { default: "5", short: "c", type: "string" },
    force: { default: false, short: "F", type: "boolean" },
    format: { default: "png", short: "f", type: "string" },
    height: { default: "180", short: "h", type: "string" },
    help: { short: "?", type: "boolean" },
    input: { short: "i", type: "string" },
    "no-overlay": { default: false, type: "boolean" },
    output: { short: "o", type: "string" },
    quality: { default: "80", short: "q", type: "string" },
    rows: { default: "5", short: "r", type: "string" },
    verbose: { default: false, short: "v", type: "boolean" },
    version: { default: false, short: "V", type: "boolean" },
    width: { default: "320", short: "w", type: "string" },
  },
}) as unknown as CliArgs;

if (parsed.version) {
  console.log(`thumbgrid v${VERSION}`);
  process.exit(0);
}

if (parsed.help) {
  console.log(`thumbgrid v${VERSION}
Usage: thumbgrid [options]

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

if (parsed.verbose) {
  logger.setLevel("debug");
}

const cliInput = parsed.input;
if (!cliInput) {
  logger.error("Error: --input is required");
  process.exit(1);
}

const cliOutput = parsed.output;
if (cliOutput && !parsed.force) {
  const exists = await fs.pathExists(cliOutput);
  if (exists) {
    logger.error(`Error: Output file already exists: ${cliOutput}. Use --force to overwrite.`);
    process.exit(1);
  }
}

const cliGenerator = new ThumbnailGenerator({
  cols: Number.parseInt(parsed.cols ?? "5"),
  frameHeight: Number.parseInt(parsed.height ?? "180"),
  frameWidth: Number.parseInt(parsed.width ?? "320"),
  outputFormat: (parsed.format ?? "png") as "png" | "jpg",
  quality: Number.parseInt(parsed.quality ?? "80"),
  rows: Number.parseInt(parsed.rows ?? "5"),
  showOverlay: !parsed["no-overlay"],
});

const spinner = ora("Generating thumbnail...").start();

if (parsed.verbose) {
  logger.debug(`Input: ${cliInput}`);
  logger.debug(
    `Options: cols=${(cliGenerator as unknown as { options: { cols: number } }).options.cols}, rows=${(cliGenerator as unknown as { options: { rows: number } }).options.rows}`,
  );
}

try {
  const result = await cliGenerator.generate(cliInput, cliOutput);

  spinner.succeed(`Generated: ${result.outputPath}`);
  console.log(`  Frames: ${result.cols}x${result.rows} = ${result.frameCount}`);
  console.log(
    `  Metadata: ${result.metadata.filename} | ${result.metadata.size} | ${result.metadata.resolution} | ${result.metadata.playtime}`,
  );

  process.exit(0);
} catch (error) {
  spinner.fail(`Failed: ${error}`);
  if (parsed.verbose && error instanceof Error) {
    logger.error(error.stack || error.message);
  }
  process.exit(1);
}
