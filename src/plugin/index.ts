import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { Plugin, ResolvedConfig } from "vite";
import type { RegisterProps } from "./type";

import { LibName, MAIN_CHUNK } from "./constant";
import { injectCode } from "./inject";
import { getPath } from "./util";
import { name } from "../../package.json";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default function (props: RegisterProps): Plugin {
    const { scopeName } = props;
    let viteConfig: ResolvedConfig;
    let isDev = true;

    return {
        name,
        config(_, { mode }) {
            isDev = mode === "development";
        },
        configResolved(rc) {
            viteConfig = rc;
        },
        buildStart() {
            if (!isDev) {
                this.emitFile({
                    type: "chunk",
                    id: MAIN_CHUNK,
                    fileName: getPath(viteConfig, isDev).mainPath.replace(/^\//, ""),
                });
            }
        },
        resolveId(id) {
            return [MAIN_CHUNK].includes(id) ? id : null;
        },
        load(id) {
            if (id === MAIN_CHUNK) {
                return injectCode({
                    pkgName: name,
                    sendData: props,
                    scopeRegisterPath: getPath(viteConfig, isDev, scopeName).registerScopePath,
                });
            }
            return null;
        },
        transformIndexHtml: (html) => {
            return {
                html,
                tags: [
                    {
                        tag: "script",
                        attrs: { defer: true, type: "module", src: getPath(viteConfig, isDev, scopeName).mainPath },
                        injectTo: "head",
                    },
                ],
            };
        },
        generateBundle() {
            // 仅做输出即可，compress 在插件中做, 需保持输出目录的一致性
            this.emitFile({
                type: "asset",
                fileName: getPath(viteConfig, isDev).registerScopePath.replace(/^\//, ""),
                source: readFileSync(resolve(__dirname, `./${LibName}`), "utf-8"),
            });
        },
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (req.url === getPath(viteConfig, isDev, scopeName).mainPath) {
                    res.setHeader("Content-Type", "application/javascript");
                    res.end(
                        injectCode({
                            pkgName: name,
                            sendData: props,
                            scopeRegisterPath: getPath(viteConfig, isDev, scopeName).registerScopePath,
                        }),
                    );
                    return;
                } else if (req.url === getPath(viteConfig, isDev, scopeName).registerScopePath) {
                    const swContent = readFileSync(resolve(__dirname, `./${LibName}`), "utf-8");
                    res.setHeader("Content-Type", "application/javascript");
                    res.end(swContent);
                    return;
                }
                next();
            });
        },
    };
}
