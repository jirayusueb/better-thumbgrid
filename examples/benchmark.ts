#!/usr/bin/env bun
import { ThumbnailGenerator } from "../src/lib";
import fs from "fs-extra";

interface Timing {
  label: string;
  start: number;
  end?: number;
}

function startTimer(label: string): Timing {
  return { label, start: Date.now() };
}

function endTimer(timing: Timing): number {
  timing.end = Date.now();
  return timing.end - timing.start;
}

const videoPath = process.argv[2] || "./SampleVideo_1280x720_1mb.mp4";
const outputPath = process.argv[3] || "./benchmark_output.png";

console.log("=== Performance Benchmark ===\n");
console.log(`Input: ${videoPath}`);
console.log(`Output: ${outputPath}\n`);

const timings: Timing[] = [];

const metadata = await fs.stat(videoPath);
console.log(`Video size: ${(metadata.size / 1024 / 1024).toFixed(2)} MB\n`);

console.log("Running benchmark...\n");

timings.push(startTimer("total"));
const gen = new ThumbnailGenerator({ cols: 4, rows: 3 });
const result = await gen.generate(videoPath, outputPath);
timings.push(startTimer("total"));

console.log("=== Results ===\n");

for (const t of timings) {
  if (t.end) {
    const ms = endTimer(t);
    console.log(`${t.label}: ${ms}ms`);
  }
}

console.log(`\nOutput: ${result.outputPath}`);
console.log(`Frames: ${result.cols}x${result.rows} = ${result.frameCount}`);
console.log(`Resolution: ${result.metadata.resolution}`);
console.log(`Duration: ${result.metadata.playtime}`);