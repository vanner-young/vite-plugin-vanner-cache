import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path, { dirname } from "node:path";
//#region src/plugin/constant.ts
const LibName = "vanner-cache.js";
//#endregion
//#region package.json
var name = "vite-plugin-vanner-cache";
//#endregion
//#region src/plugin/index.ts
const __dirname = dirname(fileURLToPath(import.meta.url));
function plugin_default(props) {
	const { scopeName } = props;
	const scope = scopeName ? `/${scopeName}/` : "/";
	const scopeRegisterPath = scopeName ? `/${scopeName}/${LibName}` : LibName;
	const sendData = {
		apis: props.apis,
		scopeName: props.scopeName,
		cacheTimeout: props.cacheTimeout
	};
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
                                        if (worker) {
                                            const previewCacheTime = localStorage.getItem("_v_cache_time");
                                            localStorage.setItem('_v_cache_time', Date.now())
                                            const sendData = {apis: ${JSON.stringify(sendData.apis)}, scopeName: ${JSON.stringify(scopeName)}}
                                            worker.postMessage(JSON.stringify({type: '_v_data', value: sendData}));

                                            // 是否清除缓存
                                            let isCleanCache = false;
                                            if (!previewCacheTime) {
                                                isCleanCache = true
                                            } else {
                                                const diff = Date.now() - Number(previewCacheTime)
                                                if (diff > ${JSON.stringify(sendData.cacheTimeout)}) {
                                                    isCleanCache = true
                                                }
                                            }
                                            if (isCleanCache) worker.postMessage(JSON.stringify({type: '_v_clean_cache', value: -1}));
                                        }
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
export { plugin_default as default };
