import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import fs from "fs-extra";
import { logger } from "../utils/logger";
import { formatBytes, formatDuration } from "../utils/formatters";
import { generateTimestamps } from "../utils/timestamps";

const FFMPEG_STATIC_PATH = require("ffmpeg-static");
const FFPROBE_STATIC_PATH = require("ffprobe-static");

/**
 * Configuration options for ThumbnailGenerator
 */
export interface ThumbnailOptions {
  /** Number of columns in the grid */
  cols: number;
  /** Number of rows in the grid */
  rows: number;
  /** Width of each frame in pixels */
  frameWidth: number;
  /** Height of each frame in pixels */
  frameHeight: number;
  /** Output image format */
  outputFormat: "png" | "jpg";
  /** Output quality (1-100) */
  quality: number;
  /** Whether to show metadata overlay */
  showOverlay: boolean;
}

/**
 * Video metadata displayed in overlay
 */
export interface VideoMetadata {
  /** Original video filename */
  filename: string;
  /** File size formatted (e.g., "150 MB") */
  size: string;
  /** File size in bytes */
  sizeBytes: number;
  /** Resolution (e.g., "1920x1080") */
  resolution: string;
  /** Playtime formatted (e.g., "1h 30m") */
  playtime: string;
}

/** FFprobe video stream info */
interface VideoStream {
  codec_type?: string;
  width?: number;
  height?: number;
}

/** FFprobe output format */
interface FfprobeFormat {
  duration?: string;
}

/** FFprobe metadata */
interface FfprobeMetadata {
  format?: FfprobeFormat;
  streams?: VideoStream[];
}

/**
 * Result of thumbnail generation
 */
export interface GenerateResult {
  /** Path to generated output file */
  outputPath: string;
  /** Video metadata */
  metadata: VideoMetadata;
  /** Total number of frames extracted */
  frameCount: number;
  /** Number of columns */
  cols: number;
  /** Number of rows */
  rows: number;
}

/**
 * Generates grid thumbnails from video files with optional metadata overlay.
 *
 * @example
 * ```typescript
 * import { ThumbnailGenerator } from "better-thumbgrid";
 *
 * const generator = new ThumbnailGenerator({ cols: 4, rows: 3 });
 * const result = await generator.generate("video.mp4", "output.png");
 * console.log(result.outputPath);
 * ```
 */
export class ThumbnailGenerator {
  private options: ThumbnailOptions;
  private ffmpegPath: string = "";

  /**
   * Creates a new ThumbnailGenerator instance.
   * @param options - Configuration options (all optional with sensible defaults)
   */
  constructor(options: Partial<ThumbnailOptions> = {}) {
    this.options = {
      cols: options.cols ?? 5,
      frameHeight: options.frameHeight ?? 180,
      frameWidth: options.frameWidth ?? 320,
      outputFormat: options.outputFormat ?? "png",
      quality: options.quality ?? 80,
      rows: options.rows ?? 5,
      showOverlay: options.showOverlay ?? true,
    };
  }

  private findFfmpeg(): string {
    if (this.ffmpegPath) {
      return this.ffmpegPath;
    }

    try {
      const ffmpegPath = FFMPEG_STATIC_PATH;
      this.ffmpegPath = ffmpegPath ?? "ffmpeg";
    } catch {
      this.ffmpegPath = "ffmpeg";
    }
    return this.ffmpegPath;
  }

  private async getVideoInfo(
    videoPath: string,
  ): Promise<{ duration: number; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const args = [
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        videoPath,
      ];

      const ffmpegPath = this.findFfmpeg();
      const ffprobePath = FFPROBE_STATIC_PATH.path;
      const proc = spawn(ffprobePath, args, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      proc.stdout?.on("data", (data) => {
        stdout += data.toString();
      });
      proc.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code !== 0 && code !== null) {
          reject(new Error(`ffprobe failed: ${stderr}`));
          return;
        }

        try {
          const metadata = JSON.parse(stdout) as FfprobeMetadata;
          const videoStream = metadata.streams?.find((s) => s.codec_type === "video");
          resolve({
            duration: Number.parseFloat(metadata.format?.duration ?? "") || 0,
            height: videoStream?.height ?? 0,
            width: videoStream?.width ?? 0,
          });
        } catch {
          reject(new Error("Failed to parse ffprobe output"));
        }
      });
    });
  }

  private async extractFrames(
    videoPath: string,
    timestamps: number[],
    tempDir: string,
  ): Promise<string[]> {
    const framePaths: string[] = [];
    const ffmpegPath = this.findFfmpeg();

    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = timestamps[i];
      if (timestamp === undefined) {
        continue;
      }
      const outputPath = path.join(tempDir, `frame_${String(i + 1).padStart(4, "0")}.jpg`);

      await new Promise<void>((resolve, reject) => {
        const args = [
          "-ss",
          timestamp.toString(),
          "-i",
          videoPath,
          "-vframes",
          "1",
          "-q:v",
          "2",
          outputPath,
        ];

        const proc = spawn(ffmpegPath, args);
        let stderr = "";
        proc.stderr.on("data", (data) => {
          stderr += data.toString();
        });
        proc.on("error", reject);
        proc.on("close", (code) => {
          if (code !== 0) {
            reject(new Error(`ffmpeg failed: ${stderr}`));
            return;
          }
          resolve();
        });
      });

      framePaths.push(outputPath);
    }

    return framePaths;
  }

  private async createGrid(framePaths: string[]): Promise<Buffer> {
    const { cols, rows, frameWidth, frameHeight } = this.options;
    const gap = 10;
    const pad = 16;
    const gridWidth = cols * frameWidth + (cols - 1) * gap + pad * 2;
    const gridHeight = rows * frameHeight + (rows - 1) * gap + pad * 2;

    const composites: { input: Buffer; left: number; top: number }[] = [];

    for (let i = 0; i < framePaths.length; i++) {
      const framePath = framePaths[i];
      if (!framePath) {
        continue;
      }
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = pad + col * (frameWidth + gap);
      const y = pad + row * (frameHeight + gap);

      const resized = await sharp(framePath).resize(frameWidth, frameHeight).toBuffer();

      composites.push({
        input: resized,
        left: x,
        top: y,
      });
    }

    const gridBuffer = await sharp({
      create: {
        background: { alpha: 1, b: 255, g: 255, r: 255 },
        channels: 4,
        height: gridHeight,
        width: gridWidth,
      },
    })
      .composite(composites)
      .png()
      .toBuffer();

    return gridBuffer;
  }

  private async addOverlay(gridBuffer: Buffer, metadata: VideoMetadata): Promise<Buffer> {
    const { frameWidth, frameHeight, cols } = this.options;
    const gap = 10;
    const pad = 16;
    const gridWidth = cols * frameWidth + (cols - 1) * gap + pad * 2;

    const fontSize = 18;
    const padOuter = 18;
    const padInner = 18;
    const rowHeight = fontSize + padInner;
    const headerHeight = rowHeight * 4 + padOuter;

    const labels = ["File Name:", "File Size:", "Resolution:", "Play Time:"];
    const values = [
      metadata.filename,
      `${metadata.size} (${metadata.sizeBytes.toLocaleString()} Bytes)`,
      metadata.resolution,
      metadata.playtime,
    ];

    const svgParts: string[] = [];
    svgParts.push(`<rect width="100%" height="100%" fill="#fff"/>`);

    for (let i = 0; i < 4; i++) {
      const y = padOuter + fontSize + padInner / 2 + i * rowHeight;
      svgParts.push(
        `<text x="${padOuter}" y="${y}" fill="#333333" font-family="monospace" font-size="${fontSize}" font-weight="bold">${labels[i]}</text>`,
      );
      svgParts.push(
        `<text x="${padOuter + 120}" y="${y}" fill="#333333" font-family="monospace" font-size="${fontSize}">${values[i]}</text>`,
      );
    }

    const svg = `<svg width="${gridWidth}" height="${headerHeight}">${svgParts.join("")}</svg>`;

    const headerBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

    const gridPad = 16;
    const gridHeightCalc =
      this.options.rows * frameHeight + (this.options.rows - 1) * gap + gridPad * 2;

    const headerGap = 10;
    const final = await sharp({
      create: {
        background: { alpha: 1, b: 255, g: 255, r: 255 },
        channels: 4,
        height: gridHeightCalc + headerHeight + headerGap,
        width: gridWidth,
      },
    })
      .composite([
        { input: gridBuffer, left: 0, top: headerHeight + headerGap },
        { input: headerBuffer, left: 0, top: 0 },
      ])
      .png()
      .toBuffer();

    return final;
  }

  /**
   * Generates a grid thumbnail from the video file.
   * @param videoPath - Path to the input video file
   * @param outputPath - Optional output path. If not provided, generates a timestamped filename
   * @returns Promise resolving to GenerateResult with output path and metadata
   * @throws Error if video file is not found or unsupported format
   */
  async generate(videoPath: string, outputPath?: string): Promise<GenerateResult> {
    logger.debug(`Starting thumbnail generation for: ${videoPath}`);

    if (!videoPath) {
      throw new Error("Video path is required");
    }

    // Path traversal prevention - resolve to absolute and check it's within allowed dirs
    const resolvedVideoPath = path.resolve(videoPath);
    const normalizedVideoPath = path.normalize(resolvedVideoPath);

    // Check for path traversal attempts
    if (videoPath.includes("..") || normalizedVideoPath.includes("..")) {
      throw new Error("Invalid path: path traversal not allowed");
    }

    const videoExists = await fs.pathExists(normalizedVideoPath);
    if (!videoExists) {
      throw new Error(`Video file not found: ${normalizedVideoPath}`);
    }

    const stat = await fs.stat(normalizedVideoPath);
    if (!stat.isFile()) {
      throw new Error(`Path is not a file: ${normalizedVideoPath}`);
    }

    // File size limit (500MB default)
    const maxFileSize = 500 * 1024 * 1024;
    if (stat.size > maxFileSize) {
      throw new Error(`File too large: ${stat.size} bytes. Max allowed: ${maxFileSize} bytes`);
    }

    const videoExt = path.extname(normalizedVideoPath).toLowerCase();
    const supportedFormats = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".flv", ".wmv", ".m4v"];
    if (!supportedFormats.includes(videoExt)) {
      throw new Error(
        `Unsupported video format: ${videoExt}. Supported: ${supportedFormats.join(", ")}`,
      );
    }

    // Resource limits validation
    const maxFrames = 100; // max 10x10 grid
    const totalFrames = this.options.cols * this.options.rows;
    if (totalFrames > maxFrames) {
      throw new Error(`Too many frames: ${totalFrames}. Max allowed: ${maxFrames}`);
    }

    // Validate frame dimensions
    if (this.options.frameWidth > 1920 || this.options.frameHeight > 1080) {
      throw new Error(
        `Frame dimensions too large: ${this.options.frameWidth}x${this.options.frameHeight}. Max: 1920x1080`,
      );
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "thumbgrid-"));
    logger.debug(`Created temp directory: ${tempDir}`);

    let output: string;
    if (outputPath) {
      // Sanitize output path
      const resolvedOutputPath = path.resolve(outputPath);
      if (outputPath.includes("..") || resolvedOutputPath.includes("..")) {
        await fs.remove(tempDir).catch(() => {});
        throw new Error("Invalid output path: path traversal not allowed");
      }
      output = resolvedOutputPath;
    } else {
      output = path.resolve(`thumbgrid_${Date.now()}.${this.options.outputFormat}`);
    }

    try {
      logger.info("Getting video info...");
      const { duration, width, height } = await this.getVideoInfo(normalizedVideoPath);
      logger.debug(`Video info: ${width}x${height}, ${duration}s`);

      // Validate video duration
      if (duration > 7200) {
        // 2 hours max
        await fs.remove(tempDir).catch(() => {});
        throw new Error(`Video too long: ${duration}s. Max allowed: 7200s (2 hours)`);
      }

      const timestamps = generateTimestamps(duration, totalFrames);
      logger.debug(`Extracting ${totalFrames} frames at timestamps: ${timestamps.join(", ")}`);

      logger.info("Extracting frames...");
      const framePaths = await this.extractFrames(normalizedVideoPath, timestamps, tempDir);

      if (framePaths.length === 0) {
        throw new Error("Failed to extract frames from video");
      }
      logger.debug(`Extracted ${framePaths.length} frames`);

      logger.info("Creating grid...");
      const gridBuffer = await this.createGrid(framePaths);

      const metadata: VideoMetadata = {
        filename: path.basename(normalizedVideoPath),
        playtime: formatDuration(duration),
        resolution: `${width}x${height}`,
        size: formatBytes(stat.size),
        sizeBytes: stat.size,
      };

      let finalBuffer: Buffer;
      if (this.options.showOverlay) {
        finalBuffer = await this.addOverlay(gridBuffer, metadata);
      } else {
        finalBuffer = gridBuffer;
      }

      try {
        await sharp(finalBuffer)
          .toFormat(this.options.outputFormat, {
            quality: this.options.quality,
          })
          .toFile(output);
      } catch (error) {
        throw new Error(
          `Failed to write output file: ${error instanceof Error ? error.message : error}`,
          { cause: error },
        );
      }

      return {
        cols: this.options.cols,
        frameCount: totalFrames,
        metadata,
        outputPath: output,
        rows: this.options.rows,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to generate thumbnail: ${error}`, { cause: error });
    } finally {
      await fs.remove(tempDir).catch(() => {});
    }
  }
}

export default ThumbnailGenerator;
