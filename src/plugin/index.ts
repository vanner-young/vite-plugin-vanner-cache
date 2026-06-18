import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path, { dirname } from "node:path";
import type { Plugin, ResolvedConfig } from "vite";
import type { RegisterProps } from "./type";

import { LibName, MAIN_CHUNK } from "./constant";
import { injectCode } from "./inject";
import { getPath } from "./util";
import { name } from "../../package.json";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default function (props: RegisterProps): Plugin {
    let viteConfig: ResolvedConfig;
    let isDev = true;

    const { scopeName = "", apis = [], cacheTimeout = 1000 * 60 * 60 } = props;
    const sendData = {
        apis,
        scopeName,
        cacheTimeout,
    };

    return {
        name,
        config(_, { mode }) {
            isDev = mode === "development";
        },
        configResolved(rc) {
            viteConfig = rc;
        },
        resolveId(id) {
            return [MAIN_CHUNK].includes(id) ? id : null;
        },
        load(id) {
            if (id === MAIN_CHUNK) {
                return injectCode({
                    pkgName: name,
                    sendData,
                    scopeRegisterPath: getPath(viteConfig, isDev, scopeName).registerScopePath,
                });
            }
            return null;
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
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (req.url === getPath(viteConfig, isDev, scopeName).mainPath) {
                    res.setHeader("Content-Type", "application/javascript");
                    res.end(
                        injectCode({
                            pkgName: name,
                            sendData,
                            scopeRegisterPath: getPath(viteConfig, isDev, scopeName).registerScopePath,
                        }),
                    );
                    return;
                } else if (req.url === getPath(viteConfig, isDev, scopeName).registerScopePath) {
                    const swContent = fs.readFileSync(path.resolve(__dirname, `./${LibName}`), "utf-8");
                    res.setHeader("Content-Type", "application/javascript");
                    res.end(swContent);
                    return;
                }
                next();
            });
        },
        generateBundle() {
            // 仅做输出即可，compress 在插件中做, 需保持输出目录的一致性
            this.emitFile({
                type: "asset",
                fileName: getPath(viteConfig, isDev).registerScopePath.replace(/^\//, ""),
                source: fs.readFileSync(path.resolve(__dirname, `./${LibName}`), "utf-8"),
            });
        },
    };
}
