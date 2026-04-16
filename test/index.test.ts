import { describe, it, expect, vi, beforeEach } from "vitest";
import { ThumbnailGenerator } from "../src/lib";

vi.mock("fluent-ffmpeg", () => {
  const mockInstance = {
    on: vi.fn().mockReturnThis(),
    setFfmpegPath: vi.fn().mockReturnThis(),
    complexFilter: vi.fn().mockReturnThis(),
    output: vi.fn().mockReturnThis(),
    ffprobe: vi.fn().mockImplementation((cb: any) => cb(null, {
      format: { duration: 120 },
      streams: [{ codec_type: "video", width: 1920, height: 1080 }]
    })),
    run: vi.fn().mockImplementation(function(this: any) {
      const self = this;
      setTimeout(() => {
        const callbacks = self.on.mock.calls.filter((call: any[]) => call[0] === "end");
        if (callbacks.length > 0) {
          (callbacks[0] as any)[1]();
        }
      }, 0);
    }),
  };
  return { default: vi.fn(() => mockInstance) };
});

vi.mock("fs-extra", () => ({
  default: {
    mkdtemp: vi.fn().mockResolvedValue("/tmp/thumbgrid-test"),
    stat: vi.fn().mockResolvedValue({ size: 1024000 }),
    readdirSync: vi.fn().mockReturnValue([
      "frame_0001.jpg",
      "frame_0002.jpg",
      "frame_0003.jpg",
      "frame_0004.jpg",
    ]),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("sharp", () => ({
  default: vi.fn().mockImplementation(() => ({
    composite: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("mock")),
    toFormat: vi.fn().mockReturnThis(),
    toFile: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe("ThumbnailGenerator", () => {
  describe("constructor", () => {
    it("should use default options when none provided", () => {
      const generator = new ThumbnailGenerator();
      expect((generator as any).options.cols).toBe(5);
      expect((generator as any).options.rows).toBe(5);
      expect((generator as any).options.frameWidth).toBe(320);
      expect((generator as any).options.frameHeight).toBe(180);
      expect((generator as any).options.outputFormat).toBe("png");
      expect((generator as any).options.quality).toBe(80);
      expect((generator as any).options.showOverlay).toBe(true);
    });

    it("should override defaults with provided options", () => {
      const generator = new ThumbnailGenerator({
        cols: 10,
        rows: 3,
        frameWidth: 640,
        frameHeight: 360,
        outputFormat: "jpg",
        quality: 50,
        showOverlay: false,
      });
      expect((generator as any).options.cols).toBe(10);
      expect((generator as any).options.rows).toBe(3);
      expect((generator as any).options.frameWidth).toBe(640);
      expect((generator as any).options.frameHeight).toBe(360);
      expect((generator as any).options.outputFormat).toBe("jpg");
      expect((generator as any).options.quality).toBe(50);
      expect((generator as any).options.showOverlay).toBe(false);
    });
  });

  describe("generateTimestamps", () => {
    it("should generate evenly spaced timestamps", () => {
      const generator = new ThumbnailGenerator();
      const timestamps = (generator as any).generateTimestamps(100, 5);
      expect(timestamps).toHaveLength(5);
      expect(timestamps[0]).toBeCloseTo(16.67, 1);
      expect(timestamps[4]).toBeCloseTo(83.33, 1);
    });
  });

  describe("formatBytes", () => {
    it("should format bytes correctly", () => {
      const generator = new ThumbnailGenerator();
      expect((generator as any).formatBytes(0)).toBe("0 B");
      expect((generator as any).formatBytes(1024)).toBe("1 KB");
      expect((generator as any).formatBytes(1048576)).toBe("1 MB");
      expect((generator as any).formatBytes(1073741824)).toBe("1 GB");
      expect((generator as any).formatBytes(1536)).toBe("1.5 KB");
    });
  });

  describe("formatDuration", () => {
    it("should format seconds to human readable", () => {
      const generator = new ThumbnailGenerator();
      expect((generator as any).formatDuration(0)).toBe("0s");
      expect((generator as any).formatDuration(45)).toBe("45s");
      expect((generator as any).formatDuration(90)).toBe("1m 30s");
      expect((generator as any).formatDuration(3661)).toBe("1h 1m 1s");
    });
  });
});