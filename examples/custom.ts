#!/usr/bin/env bun
import { ThumbnailGenerator } from "../src/core";

const videoPath = process.argv[2] || "./examples/SampleVideo_1280x720_1mb.mp4";
const outputPath = process.argv[3] || "./custom_output.png";

console.log(`Processing: ${videoPath}`);
console.log(`Output: ${outputPath}`);

const generator = new ThumbnailGenerator({
  cols: 3,
  frameHeight: 360,
  frameWidth: 640,
  outputFormat: "jpg",
  quality: 90,
  rows: 2,
  showOverlay: true,
});

const result = await generator.generate(videoPath, outputPath);

console.log("Result:", JSON.stringify(result, null, 2));
