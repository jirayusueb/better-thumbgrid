import { defineConfig } from "tsdown";

export default defineConfig([
  {
    clean: true,
    dts: true,
    entry: {
      cli: "./src/cli/index.ts",
      lib: "./src/core/index.ts",
    },
    format: ["esm"],
    minify: false,
    outDir: "./dist",
    target: "node18",
  },
]);
