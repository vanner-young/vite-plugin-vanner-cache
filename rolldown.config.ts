import { defineConfig } from "rolldown";

export default defineConfig([
    {
        input: "src/sw/index.ts",
        output: {
            format: "esm",
            file: "./dist/vanner-cache.js",
        },
    },
    {
        input: "src/plugin/index.ts",
        output: {
            format: "esm",
            file: "./dist/plugin.js",
        },
    },
]);
