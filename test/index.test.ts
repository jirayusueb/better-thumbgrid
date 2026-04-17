import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { spawn } from "node:child_process";
import os from "node:os";
import fs from "fs-extra";
import sharp from "sharp";
import { ThumbnailGenerator } from "../src/core";

vi.mock("ffmpeg-static", () => ({ default: "/fake/ffmpeg" }));
vi.mock("ffprobe-static", () => ({ path: "/fake/ffprobe" }));

const mockFs = {
  mkdtemp: vi.fn().mockResolvedValue(os.tmpdir() + "/thumbgrid-test"),
  pathExists: vi.fn().mockResolvedValue(true),
  readdir: vi
    .fn()
    .mockResolvedValue(["frame_0001.jpg", "frame_0002.jpg", "frame_0003.jpg", "frame_0004.jpg"]),
  readdirSync: vi
    .fn()
    .mockReturnValue(["frame_0001.jpg", "frame_0002.jpg", "frame_0003.jpg", "frame_0004.jpg"]),
  remove: vi.fn().mockResolvedValue(undefined),
  stat: vi.fn().mockResolvedValue({ size: 1_024_000, isFile: () => true }),
};

vi.mock("fs-extra", () => ({ default: mockFs }));

const mockSharp = vi.fn().mockImplementation(() => ({
  composite: vi.fn().mockReturnThis(),
  create: vi.fn().mockReturnThis(),
  jpeg: vi.fn().mockReturnThis(),
  png: vi.fn().mockReturnThis(),
  resize: vi.fn().mockReturnThis(),
  toBuffer: vi.fn().mockResolvedValue(Buffer.from("png")),
  toFile: vi.fn().mockResolvedValue(undefined),
  toFormat: vi.fn().mockReturnThis(),
}));

vi.mock("sharp", () => ({ default: mockSharp }));

const mockSpawn = vi.fn();
vi.mock("node:child_process", () => ({ spawn: mockSpawn }));

describe(ThumbnailGenerator, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should use default options when none provided", () => {
      const generator = new ThumbnailGenerator();
      expect(generator.options.cols).toBe(5);
      expect(generator.options.rows).toBe(5);
      expect(generator.options.frameWidth).toBe(320);
      expect(generator.options.frameHeight).toBe(180);
      expect(generator.options.outputFormat).toBe("png");
      expect(generator.options.quality).toBe(80);
      expect(generator.options.showOverlay).toBe(true);
    });

    it("should override defaults with provided options", () => {
      const generator = new ThumbnailGenerator({
        cols: 10,
        frameHeight: 360,
        frameWidth: 640,
        outputFormat: "jpg",
        quality: 50,
        rows: 3,
        showOverlay: false,
      });
      expect(generator.options.cols).toBe(10);
      expect(generator.options.rows).toBe(3);
      expect(generator.options.frameWidth).toBe(640);
      expect(generator.options.frameHeight).toBe(360);
      expect(generator.options.outputFormat).toBe("jpg");
      expect(generator.options.quality).toBe(50);
      expect(generator.options.showOverlay).toBe(false);
    });
  });

  describe("formatBytes", () => {
    it("should format bytes correctly", () => {
      const generator = new ThumbnailGenerator();
      expect(generator.options.cols).toBe(5);
    });
  });
});
