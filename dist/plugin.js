import fs from "node:fs";
import { fileURLToPath } from "url";
import path, { dirname } from "node:path";
//#region package.json
var name = "vite-plugin-fetch-cache";
//#endregion
//#region src/plugin/index.ts
const __dirname = dirname(fileURLToPath(import.meta.url));
const LibName = "vanner-cache.js";
function plugin_default(props) {
	const { scopeName, apis = [] } = props;
	const scope = scopeName ? `/${scopeName}/` : "/";
	const scopeRegisterPath = scopeName ? `/${scopeName}/${LibName}` : LibName;
	const sendData = { apis };
	return {
		name,
		transformIndexHtml: (html) => {
			return {
				html,
				tags: [{
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
					injectTo: "body"
				}]
			};
		},
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				const scopePath = path.resolve(__dirname, `./${LibName}`);
				if (req.url === scopeRegisterPath) {
					const swContent = fs.readFileSync(scopePath, "utf-8");
					res.setHeader("Content-Type", "application/javascript");
					res.end(swContent);
					return;
				}
				next();
			});
		}
	};
}
//#endregion
export { LibName, plugin_default as default };
