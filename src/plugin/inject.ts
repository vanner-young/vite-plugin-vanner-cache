import type { InjectProps } from "./type";

export function injectCode({ pkgName, sendData, scopeRegisterPath }: InjectProps) {
    const scope = sendData.scopeName ? `/${sendData.scopeName}/` : "/";

    return `
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                const cacheTimeout = ${JSON.stringify(sendData.cacheTimeout)}
                if (cacheTimeout && cacheTimeout < 1000 * 60 * 60) {
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
                        apis: ${JSON.stringify(sendData.apis || [])}, 
                        scopeName: ${JSON.stringify(sendData?.scopeName || "")},
                        maxCacheNumber: ${JSON.stringify(sendData?.maxCacheNumber || 100)}
                    };
                    worker.postMessage(JSON.stringify({type: '_v_data', value: finalData}));

                    let isCleanCache = false;
                    if (cacheTimeout && previewCacheTime) {
                        const diff = Date.now() - Number(previewCacheTime);
                        if (diff > ${Number(sendData.cacheTimeout)}) {
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
