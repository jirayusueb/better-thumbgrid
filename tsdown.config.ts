import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: {
      cli: "./src/cli.ts",
      lib: "./src/lib.ts",
    },
    outDir: "./dist",
    format: ["esm"],
    dts: true,
    minify: false,
    target: "node18",
    clean: true,
  },
]);