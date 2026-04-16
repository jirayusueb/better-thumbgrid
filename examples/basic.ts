#!/usr/bin/env bun
import { ThumbnailGenerator } from "../src/lib";

const videoPath = "./SampleVideo_1280x720_1mb.mp4";

console.log("Generating thumbnail from sample video...");

const generator = new ThumbnailGenerator({
  cols: 4,
  rows: 3,
  frameWidth: 320,
  frameHeight: 180,
  outputFormat: "png",
  quality: 85,
  showOverlay: true,
});

const result = await generator.generate(videoPath, "./output.png");

console.log("Done!");
console.log(result);