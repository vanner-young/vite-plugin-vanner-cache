import { defineConfig } from "rolldown";

export default defineConfig([
    {
        // 注入 code，不 compress
        input: "src/plugin/index.ts",
        output: {
            format: "esm",
            file: "./dist/plugin.js",
        },
    },
    {
        input: "src/sw/index.ts",
        output: {
            format: "esm",
            file: "./dist/vanner-cache.js",
            // 本地 rolldown 构建，加快客户端构建速度
            minify: {
                compress: true,
            },
        },
    },
]);
