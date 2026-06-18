import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path, { dirname } from "node:path";
//#region src/plugin/constant.ts
const LibName = "vanner-cache.js";
const MAIN_CHUNK = "_v_main_fetch_code_chunk";
//#endregion
//#region src/plugin/inject.ts
function injectCode({ pkgName, sendData, scopeRegisterPath }) {
	const scope = sendData.scopeName ? `/${sendData.scopeName}/` : "/";
	return `
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {

                if (${Number(sendData.cacheTimeout)} <= 0) {
                    navigator.serviceWorker.getRegistration('${scope}').then((registration) => {
                        if (!registration) return
                        registration.unregister().then(() => {
                            console.log('clean fetch cache success...');
                        });
                    });
                    return;
                }


                const schedulePostMessage = (worker) => {
                    if (!worker) return;
                    
                    const previewCacheTime = localStorage.getItem("_v_cache_time");
                    localStorage.setItem('_v_cache_time', Date.now());
                    
                    const finalData = {
                        apis: ${JSON.stringify(sendData.apis)}, 
                        scopeName: ${JSON.stringify(sendData.scopeName)}
                    };
                    worker.postMessage(JSON.stringify({type: '_v_data', value: finalData}));

                    let isCleanCache = !previewCacheTime;
                    if (previewCacheTime) {
                        const diff = Date.now() - Number(previewCacheTime);
                        if (diff > ${Number(sendData.cacheTimeout) || 0}) {
                            isCleanCache = true;
                        }
                    }
                    if (isCleanCache) {
                        worker.postMessage(JSON.stringify({type: '_v_clean_cache', value: -1}));
                    }
                };

                navigator.serviceWorker.register('${scopeRegisterPath}', { scope: '${scope}' })
                    .then(registration => {
                        if (registration.active) {
                            schedulePostMessage(registration.active);
                        } else {
                            const worker = registration.installing || registration.waiting;
                            if (worker) {
                                worker.addEventListener('statechange', (e) => {
                                    if (e.target.state === 'activated') {
                                        schedulePostMessage(e.target);
                                    }
                                });
                            }
                        }
                    })
                    .catch(err => {
                        console.error("${pkgName} cache start fail...", err);
                    });
            }); 
        }
    `;
}
//#endregion
//#region src/plugin/util.ts
const getPath = (config, isDev, scopeName = "") => {
	let mainPath = "";
	let registerScopePath = "";
	if (!isDev) {
		const assetsDir = config?.build?.assetsDir || "assets";
		mainPath = scopeName ? `/${scopeName}/${assetsDir}/fetch_cache.js` : `/${assetsDir}/fetch_cache.js`;
		registerScopePath = scopeName ? `/${scopeName}/${LibName}` : `/${LibName}`;
	} else {
		mainPath = scopeName ? `/${scopeName}/_v/fetch_cache.js` : "/_v/fetch_cache.js";
		registerScopePath = scopeName ? `/${scopeName}/${LibName}` : `/${LibName}`;
	}
	return {
		mainPath,
		registerScopePath
	};
};
//#endregion
//#region package.json
var name = "vite-plugin-vanner-cache";
//#endregion
//#region src/plugin/index.ts
const __dirname = dirname(fileURLToPath(import.meta.url));
function plugin_default(props) {
	let viteConfig;
	let isDev = true;
	const { scopeName = "", apis = [], cacheTimeout = 1e3 * 60 * 60 } = props;
	const sendData = {
		apis,
		scopeName,
		cacheTimeout
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
			return ["_v_main_fetch_code_chunk"].includes(id) ? id : null;
		},
		load(id) {
			if (id === "_v_main_fetch_code_chunk") return injectCode({
				pkgName: name,
				sendData,
				scopeRegisterPath: getPath(viteConfig, isDev, scopeName).registerScopePath
			});
			return null;
		},
		buildStart() {
			if (!isDev) this.emitFile({
				type: "chunk",
				id: MAIN_CHUNK,
				fileName: getPath(viteConfig, isDev).mainPath.replace(/^\//, "")
			});
		},
		transformIndexHtml: (html) => {
			return {
				html,
				tags: [{
					tag: "script",
					attrs: {
						defer: true,
						type: "module",
						src: getPath(viteConfig, isDev, scopeName).mainPath
					},
					injectTo: "head"
				}]
			};
		},
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				if (req.url === getPath(viteConfig, isDev, scopeName).mainPath) {
					res.setHeader("Content-Type", "application/javascript");
					res.end(injectCode({
						pkgName: name,
						sendData,
						scopeRegisterPath: getPath(viteConfig, isDev, scopeName).registerScopePath
					}));
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
			this.emitFile({
				type: "asset",
				fileName: getPath(viteConfig, isDev).registerScopePath.replace(/^\//, ""),
				source: fs.readFileSync(path.resolve(__dirname, `./${LibName}`), "utf-8")
			});
		}
	};
}
//#endregion
export { plugin_default as default };
