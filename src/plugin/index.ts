import fs from "node:fs";
import { fileURLToPath } from "url";
import path, { dirname } from "node:path";

import { name } from "../../package.json";

import type { Plugin } from "vite";
import type { RegisterProps } from "../types/sw";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const LibName = "vanner-cache.js";

export default function (props: RegisterProps): Plugin {
    const { scopeName, apis = [] } = props;
    const scope = scopeName ? `/${scopeName}/` : "/";
    const scopeRegisterPath = scopeName ? `/${scopeName}/${LibName}` : LibName;

    const sendData = {
        apis, // 需要拦截的api列表
    };

    return {
        name,
        transformIndexHtml: (html) => {
            return {
                html,
                tags: [
                    {
                        tag: "script",
                        attrs: { defer: true },
                        children: `
                            if ('serviceWorker' in navigator) {
                                window.addEventListener('load', () => {
                                navigator.serviceWorker.register('${scopeRegisterPath}', { scope: '${scope}' })
                                    .then(registration => {
                                        const worker = registration.active || registration.installing || registration.waiting;
                                        if (worker) worker.postMessage(${JSON.stringify(sendData)});
                                    })
                                    .catch(err => {
                                        console.log("${name} cache start fail...", err);
                                    });
                                }); 
                            }
                        `,
                        injectTo: "body",
                    },
                ],
            };
        },
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                // 确保路径根目录统一
                const scopePath = path.resolve(__dirname, `./${LibName}`);

                if (req.url === scopeRegisterPath) {
                    const swContent = fs.readFileSync(scopePath, "utf-8");
                    res.setHeader("Content-Type", "application/javascript");
                    res.end(swContent);
                    return;
                }
                next();
            });
        },
    };
}
