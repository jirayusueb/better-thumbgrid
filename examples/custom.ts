#!/usr/bin/env bun
import { ThumbnailGenerator } from "../src/lib";

const videoPath = process.argv[2] || "./SampleVideo_1280x720_1mb.mp4";
const outputPath = process.argv[3] || "./custom_output.png";

console.log(`Processing: ${videoPath}`);
console.log(`Output: ${outputPath}`);

const generator = new ThumbnailGenerator({
  cols: 3,
  rows: 2,
  frameWidth: 640,
  frameHeight: 360,
  outputFormat: "jpg",
  quality: 90,
  showOverlay: true,
});

const result = await generator.generate(videoPath, outputPath);

console.log("Result:", JSON.stringify(result, null, 2));