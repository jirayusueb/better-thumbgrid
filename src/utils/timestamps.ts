/**
 * Generate evenly spaced timestamps for frame extraction
 */
export function generateTimestamps(duration: number, count: number): number[] {
  const timestamps: number[] = [];
  const interval = duration / (count + 1);

  for (let i = 1; i <= count; i++) {
    timestamps.push(interval * i);
  }

  return timestamps;
}
