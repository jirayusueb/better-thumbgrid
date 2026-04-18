# better-thumbgrid

Generate grid thumbnails and metadata overlay from video files.

[![npm version](https://img.shields.io/npm/v/better-thumbgrid)](https://www.npmjs.com/package/better-thumbgrid)
[![GitHub](https://img.shields.io/github/license/jirayusueb/better-thumbgrid)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/jirayusueb/better-thumbgrid)](https://github.com/jirayusueb/better-thumbgrid)

## Quick Start

```bash
npx better-thumbgrid -i video.mp4 -o output.png
```

## Installation

### Via npx (no install)

```bash
npx better-thumbgrid -i video.mp4 -o output.png
```

### Via npm (global)

```bash
npm install -g better-thumbgrid
thumbgrid -i video.mp4 -o output.png
```

### Via bun

```bash
bunx better-thumbgrid -i video.mp4 -o output.png
```

### As OpenCode Skill

```bash
npx skills@latest add jirayusueb/better-thumbgrid
```

### From source

```bash
bun install
bun run build
```

## CLI Usage

### Quick Start

```bash
thumbgrid -i video.mp4 -o output.png
```

### Examples

```bash
# Custom grid layout
thumbgrid -i video.mp4 -o output.png -c 4 -r 3

# No overlay
thumbgrid -i video.mp4 -o output.png --no-overlay

# JPEG with quality
thumbgrid -i video.mp4 -o output.jpg -f jpg -q 90

# Force overwrite
thumbgrid -i video.mp4 -o existing.png -F

# Verbose logging
thumbgrid -i video.mp4 -o output.png -v
```

### Options

| Flag            | Description                      | Default        |
| --------------- | -------------------------------- | -------------- |
| `-i, --input`   | Input video file                 | (required)     |
| `-o, --output`  | Output image path                | auto-generated |
| `-c, --cols`    | Number of columns                | 5              |
| `-r, --rows`    | Number of rows                   | 5              |
| `-w, --width`   | Frame width (px)                 | 320            |
| `-h, --height`  | Frame height (px)                | 180            |
| `-f, --format`  | Output format (png/jpg)          | png            |
| `-q, --quality` | Output quality (1-100)           | 80             |
| `-F, --force`   | Force overwrite if output exists | false          |
| `-v, --verbose` | Enable verbose logging           | false          |
| `--no-overlay`  | Disable metadata overlay         | false          |
| `-V, --version` | Show version                     | false          |
| `-?, --help`    | Show help                        | false          |

## Library Usage

```typescript
import { ThumbnailGenerator } from "better-thumbgrid";

const generator = new ThumbnailGenerator({
  cols: 5,
  rows: 5,
  frameWidth: 320,
  frameHeight: 180,
  outputFormat: "png",
  quality: 80,
  showOverlay: true,
});

const result = await generator.generate("video.mp4", "output.png");
console.log(result);
// {
//   outputPath: "output.png",
//   metadata: { filename: "video.mp4", size: "150 MB", sizeBytes: 157286400, resolution: "1920x1080", playtime: "01:30:45" },
//   frameCount: 25,
//   cols: 5,
//   rows: 5
// }
```

### TypeScript Types

```typescript
import type {
  ThumbnailOptions,
  VideoMetadata,
  GenerateResult,
  VideoStream,
} from "better-thumbgrid";

// All options are optional with sensible defaults
type ThumbnailOptions = {
  cols: number; // Number of columns (default: 5)
  rows: number; // Number of rows (default: 5)
  frameWidth: number; // Width of each frame in px (default: 320)
  frameHeight: number; // Height of each frame in px (default: 180)
  outputFormat: "png" | "jpg"; // Output format (default: "png")
  quality: number; // Output quality 1-100 (default: 80)
  showOverlay: boolean; // Show metadata overlay (default: true)
};

type GenerateResult = {
  outputPath: string;
  metadata: VideoMetadata;
  frameCount: number;
  cols: number;
  rows: number;
};

type VideoMetadata = {
  filename: string;
  size: string;
  sizeBytes: number;
  resolution: string;
  playtime: string;
};
```

### Advanced Usage

```typescript
// Use exported utilities
import { generateTimestamps, formatBytes, formatDuration } from "better-thumbgrid";

// Generate timestamps for a 60-second video, 10 frames
const timestamps = generateTimestamps(60, 10);
console.log(timestamps); // [6, 12, 18, 24, 30, 36, 42, 48, 54, 60]

// Format file size
console.log(formatBytes(1024)); // "1 KB"
console.log(formatBytes(1024 * 1024)); // "1 MB"

// Format duration in seconds
console.log(formatDuration(3661)); // "01:01:01"
```

### Options

| Option         | Type           | Default | Description            |
| -------------- | -------------- | ------- | ---------------------- |
| `cols`         | number         | 5       | Number of columns      |
| `rows`         | number         | 5       | Number of rows         |
| `frameWidth`   | number         | 320     | Width of each frame    |
| `frameHeight`  | number         | 180     | Height of each frame   |
| `outputFormat` | "png" \| "jpg" | "png"   | Output format          |
| `quality`      | number         | 80      | Output quality (1-100) |
| `showOverlay`  | boolean        | true    | Show metadata overlay  |

## Examples

See the `examples/` directory for runnable scripts.

### Basic Example

```bash
cd examples
bun run basic.ts
```

### Custom Options

```bash
cd examples
bun run custom.ts video.mp4 custom_output.jpg
```

### Benchmark

```bash
cd examples
bun run benchmark.ts video.mp4
```

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build
bun run build

# Development
bun run dev
```

## Supported Video Formats

- MP4, MOV, AVI, MKV, WebM, FLV, WMV, M4V

## Limits

| Limit            | Value | Description                    |
| ---------------- | ----- | ------------------------------ |
| Max frames       | 100   | 10x10 grid maximum             |
| Max frame width  | 1920  | Maximum frame width in pixels  |
| Max frame height | 1080  | Maximum frame height in pixels |

## License

MIT
