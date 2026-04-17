#!/usr/bin/env bun
import { ThumbnailGenerator } from "../src/core";

const videoPath = "./examples/SampleVideo_1280x720_1mb.mp4";

console.log("Generating thumbnail from sample video...");

const generator = new ThumbnailGenerator({
  cols: 4,
  frameHeight: 180,
  frameWidth: 320,
  outputFormat: "png",
  quality: 85,
  rows: 3,
  showOverlay: true,
});

const result = await generator.generate(videoPath, "./output.png");

console.log("Done!");
console.log(result);
