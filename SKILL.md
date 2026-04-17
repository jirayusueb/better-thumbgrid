---
name: better-thumbgrid
description: Generate grid thumbnails with metadata overlay from video files. Use when user wants to create video thumbnails, grid contact sheets, extract frames, or mentions video-to-image conversion.
---

# better-thumbgrid

Generate grid thumbnails with metadata overlay from video files.

## Installation

```bash
npm install -g better-thumbgrid
# or
bun install && bun run build
```

## CLI Quick Start

```bash
thumbgrid -i video.mp4 -o output.png
```

## CLI Options

| Flag            | Description              | Default        |
| --------------- | ------------------------ | -------------- |
| `-i, --input`   | Input video file         | required       |
| `-o, --output`  | Output image path        | auto-generated |
| `-c, --cols`    | Number of columns        | 5              |
| `-r, --rows`    | Number of rows           | 5              |
| `-w, --width`   | Frame width (px)         | 320            |
| `-h, --height`  | Frame height (px)        | 180            |
| `-f, --format`  | Output format (png/jpg)  | png            |
| `-q, --quality` | Quality (1-100)          | 80             |
| `-F, --force`   | Force overwrite          | false          |
| `-v, --verbose` | Verbose logging          | false          |
| `--no-overlay`  | Disable metadata overlay | false          |
| `-?, --help`    | Show help                | false          |

## CLI Examples

```bash
# Custom grid layout
thumbgrid -i video.mp4 -c 4 -r 3

# No metadata overlay
thumbgrid -i video.mp4 --no-overlay

# JPEG output
thumbgrid -i video.mp4 -o output.jpg -f jpg -q 90

# Force overwrite existing
thumbgrid -i video.mp4 -o existing.png -F

# Verbose logging
thumbgrid -i video.mp4 -v
```

## Library Usage

```typescript
import { ThumbnailGenerator } from "better-thumbgrid";

const generator = new ThumbnailGenerator({
  cols: 4,
  rows: 3,
  frameWidth: 320,
  frameHeight: 180,
  outputFormat: "png",
  quality: 80,
  showOverlay: true,
});

const result = await generator.generate("video.mp4", "output.png");
console.log(result);

// Result:
// {
//   outputPath: "output.png",
//   metadata: {
//     filename: "video.mp4",
//     size: "150 MB",
//     resolution: "1920x1080",
//     playtime: "1h 30m 45s"
//   },
//   frameCount: 12,
//   cols: 4,
//   rows: 3
// }
```

## Library Options

| Option         | Type           | Default | Description           |
| -------------- | -------------- | ------- | --------------------- |
| `cols`         | number         | 5       | Number of columns     |
| `rows`         | number         | 5       | Number of rows        |
| `frameWidth`   | number         | 320     | Frame width           |
| `frameHeight`  | number         | 180     | Frame height          |
| `outputFormat` | "png" \| "jpg" | "png"   | Output format         |
| `quality`      | number         | 80      | Quality (1-100)       |
| `showOverlay`  | boolean        | true    | Show metadata overlay |

## Supported Video Formats

MP4, MOV, AVI, MKV, WebM, FLV, WMV, M4V

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build
bun run build

# Development mode
bun run dev
```

## References

- GitHub: https://github.com/jirayusueb/better-thumbgrid
- npm: https://www.npmjs.com/package/better-thumbgrid
