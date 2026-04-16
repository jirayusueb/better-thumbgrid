# better-thumbgrid

Generate grid thumbnails and metadata overlay from video files.

[![npm version](https://img.shields.io/npm/v/better-thumbgrid)](https://www.npmjs.com/package/better-thumbgrid)
[![GitHub](https://img.shields.io/github/license/jirayusueb/better-thumbgrid)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/jirayusueb/better-thumbgrid)](https://github.com/jirayusueb/better-thumbgrid)

## Installation

### As OpenCode Skill

```bash
npx skills@latest add jirayusueb/better-thumbgrid
```

### Via npm

```bash
npm install -g better-thumbgrid
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

| Flag | Description | Default |
|------|-------------|---------|
| `-i, --input` | Input video file | (required) |
| `-o, --output` | Output image path | auto-generated |
| `-c, --cols` | Number of columns | 5 |
| `-r, --rows` | Number of rows | 5 |
| `-w, --width` | Frame width (px) | 320 |
| `-h, --height` | Frame height (px) | 180 |
| `-f, --format` | Output format (png/jpg) | png |
| `-q, --quality` | Output quality (1-100) | 80 |
| `-F, --force` | Force overwrite if output exists | false |
| `-v, --verbose` | Enable verbose logging | false |
| `--no-overlay` | Disable metadata overlay | false |
| `-V, --version` | Show version | false |
| `-?, --help` | Show help | false |

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
//   metadata: { filename: "video.mp4", size: "150 MB", resolution: "1920x1080", playtime: "1h 30m 45s" },
//   frameCount: 25,
//   cols: 5,
//   rows: 5
// }
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cols` | number | 5 | Number of columns |
| `rows` | number | 5 | Number of rows |
| `frameWidth` | number | 320 | Width of each frame |
| `frameHeight` | number | 180 | Height of each frame |
| `outputFormat` | "png" \| "jpg" | "png" | Output format |
| `quality` | number | 80 | Output quality (1-100) |
| `showOverlay` | boolean | true | Show metadata overlay |

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

## License

MIT