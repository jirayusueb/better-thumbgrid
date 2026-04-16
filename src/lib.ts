import { spawn } from "child_process";
import path from "path";
import os from "os";
import sharp from "sharp";
import fs from "fs-extra";
import { logger } from "./logger";

const FFMPEG_STATIC_PATH = require("ffmpeg-static");

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
  /** Resolution (e.g., "1920x1080") */
  resolution: string;
  /** Playtime formatted (e.g., "1h 30m") */
  playtime: string;
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
      rows: options.rows ?? 5,
      frameWidth: options.frameWidth ?? 320,
      frameHeight: options.frameHeight ?? 180,
      outputFormat: options.outputFormat ?? "png",
      quality: options.quality ?? 80,
      showOverlay: options.showOverlay ?? true,
    };
  }

  private findFfmpeg(): string {
    if (this.ffmpegPath) return this.ffmpegPath;

    try {
      const ffmpegPath = FFMPEG_STATIC_PATH;
      this.ffmpegPath = ffmpegPath ?? "ffmpeg";
    } catch {
      this.ffmpegPath = "ffmpeg";
    }
    return this.ffmpegPath;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  private formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  private async getVideoInfo(videoPath: string): Promise<{ duration: number; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const args = [
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        videoPath,
      ];

      const ffmpegPath = this.findFfmpeg();
      const ffprobePath = ffmpegPath.replace(/ffmpeg$/, "ffprobe");
      const proc = spawn(ffprobePath, args, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      proc.stdout?.on("data", (data) => { stdout += data.toString(); });
      proc.stderr?.on("data", (data) => { stderr += data.toString(); });

      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code !== 0 && code !== null) {
          reject(new Error(`ffprobe failed: ${stderr}`));
          return;
        }

        try {
          const metadata = JSON.parse(stdout);
          const videoStream = metadata.streams?.find((s: any) => s.codec_type === "video");
          resolve({
            duration: parseFloat(metadata.format?.duration) || 0,
            width: videoStream?.width || 0,
            height: videoStream?.height || 0,
          });
        } catch (e) {
          reject(new Error("Failed to parse ffprobe output"));
        }
      });
    });
  }

  private generateTimestamps(duration: number, count: number): number[] {
    const timestamps: number[] = [];
    const interval = duration / (count + 1);
    for (let i = 1; i <= count; i++) {
      timestamps.push(interval * i);
    }
    return timestamps;
  }

  private async extractFrames(videoPath: string, timestamps: number[], tempDir: string): Promise<string[]> {
    const frameIndices = timestamps.map((ts) => Math.floor(ts * 30)).join("+");
    const filter = `select=eq(n,${frameIndices})`;

    return new Promise((resolve, reject) => {
      const args = [
        "-i", videoPath,
        "-vf", filter,
        "-frames:v", timestamps.length.toString(),
        "-f", "image2",
        path.join(tempDir, "frame_%04d.jpg"),
      ];

      const ffmpegPath = this.findFfmpeg();
      const proc = spawn(ffmpegPath, args);

      let stderr = "";
      proc.stderr.on("data", (data) => { stderr += data.toString(); });
      proc.on("error", (err) => reject(err));
      proc.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`ffmpeg failed: ${stderr}`));
          return;
        }
        const files = fs.readdirSync(tempDir).filter((f: string) => f.startsWith("frame_")).sort();
        const framePaths = files.map((f: string) => path.join(tempDir, f));
        resolve(framePaths);
      });
    });
  }

  private async createGrid(framePaths: string[]): Promise<Buffer> {
    const { cols, rows, frameWidth, frameHeight } = this.options;
    const gap = 10;
    const gridWidth = cols * frameWidth + (cols - 1) * gap;
    const gridHeight = rows * frameHeight + (rows - 1) * gap;

    const composites: { input: string; left: number; top: number }[] = [];

    for (let i = 0; i < framePaths.length; i++) {
      const framePath = framePaths[i];
      if (!framePath) continue;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * (frameWidth + gap);
      const y = row * (frameHeight + gap);

      composites.push({
        input: framePath,
        left: x,
        top: y,
      });
    }

    const gridBuffer = await sharp({
      create: {
        width: gridWidth,
        height: gridHeight,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .composite(composites)
      .toBuffer();

    return gridBuffer;
  }

  private async addOverlay(gridBuffer: Buffer, metadata: VideoMetadata): Promise<Buffer> {
    const { frameWidth, frameHeight, cols } = this.options;
    const gap = 10;
    const gridWidth = cols * frameWidth + (cols - 1) * gap;

    const text = `${metadata.filename} | ${metadata.size} | ${metadata.resolution} | ${metadata.playtime}`;
    const fontSize = 24;
    const padding = 10;
    const headerHeight = fontSize + padding * 2;

    const svg = `
      <svg width="${gridWidth}" height="${headerHeight}">
        <rect width="100%" height="100%" fill="#1a1a1a"/>
        <text x="10" y="${fontSize + padding}" fill="white" font-family="monospace" font-size="${fontSize}">
          ${text}
        </text>
      </svg>
    `;

    const headerBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

    const finalHeight = gridBuffer.length ? headerHeight + gridWidth : headerHeight;

    const gridHeightCalc = this.options.rows * frameHeight + (this.options.rows - 1) * gap;

    const final = await sharp({
      create: {
        width: gridWidth,
        height: gridHeightCalc,
        channels: 4,
        background: { r: 26, g: 26, b: 26, alpha: 1 },
      },
    })
      .composite([
        { input: headerBuffer, left: 0, top: 0 },
        { input: gridBuffer, left: 0, top: headerHeight },
      ])
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
      throw new Error(`Unsupported video format: ${videoExt}. Supported: ${supportedFormats.join(", ")}`);
    }

    // Resource limits validation
    const maxFrames = 100; // max 10x10 grid
    const totalFrames = this.options.cols * this.options.rows;
    if (totalFrames > maxFrames) {
      throw new Error(`Too many frames: ${totalFrames}. Max allowed: ${maxFrames}`);
    }

    // Validate frame dimensions
    if (this.options.frameWidth > 1920 || this.options.frameHeight > 1080) {
      throw new Error(`Frame dimensions too large: ${this.options.frameWidth}x${this.options.frameHeight}. Max: 1920x1080`);
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
      if (duration > 7200) { // 2 hours max
        await fs.remove(tempDir).catch(() => {});
        throw new Error(`Video too long: ${duration}s. Max allowed: 7200s (2 hours)`);
      }

      const timestamps = this.generateTimestamps(duration, totalFrames);
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
        size: this.formatBytes(stat.size),
        resolution: `${width}x${height}`,
        playtime: this.formatDuration(duration),
      };

      let finalBuffer: Buffer;
      if (this.options.showOverlay) {
        finalBuffer = await this.addOverlay(gridBuffer, metadata);
      } else {
        finalBuffer = gridBuffer;
      }

      try {
        await sharp(finalBuffer)
          .toFormat(this.options.outputFormat, { quality: this.options.quality })
          .toFile(output);
      } catch (writeErr) {
        throw new Error(`Failed to write output file: ${writeErr instanceof Error ? writeErr.message : writeErr}`);
      }

      return {
        outputPath: output,
        metadata,
        frameCount: totalFrames,
        cols: this.options.cols,
        rows: this.options.rows,
      };
    } catch (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error(`Failed to generate thumbnail: ${err}`);
    } finally {
      await fs.remove(tempDir).catch(() => {});
    }
  }
}

export default ThumbnailGenerator;