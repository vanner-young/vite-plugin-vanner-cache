export interface Props {
    scope: string; // 域
    scopePath: string; // 域路径
    apis: Array<string>; // 拦截的api列表
    maxCacheNumber: number; // 最大缓存接口数量，超出将会被LUR

    isOpenStage?: boolean; // 是否开启实验室功能
    translateServerPrefix?: string; // 转换请求类型后的url请求前缀（实验室功能开启后使用）
}

export default function (props: Props) {
    if (typeof window !== "undefined") {
        window.addEventListener("load", () => {
            // 校验是否需要使用的到此插件
            if (!Array.isArray(props.apis) || !props.apis.length || !props.maxCacheNumber || props.maxCacheNumber < 0)
                return;

            const schedulePostMessage = (worker: any) => {
                if (!worker) return;

                // 浏览器使用，无缓存时效
                const sendData = {
                    apis: props.apis,
                    scopeName: "vanner",
                    maxCacheNumber: props.maxCacheNumber,
                    stage: props.isOpenStage || false,
                    translateServerPrefix: props.translateServerPrefix || "",
                };
                worker.postMessage(JSON.stringify({ type: "_v_data", value: sendData }));
            };

            if ("serviceWorker" in navigator) {
                navigator.serviceWorker
                    .register(props.scopePath, { scope: props.scope })
                    .then((reg) => {
                        if (reg.active) {
                            schedulePostMessage(reg.active);
                        } else {
                            const worker = reg.installing || reg.waiting;
                            if (worker) {
                                worker.addEventListener("statechange", (e: any) => {
                                    if (e.target?.state === "activated") {
                                        schedulePostMessage(e.target);
                                    }
                                });
                            }
                        }
                    })
                    .catch((err) => {
                        console.error("vanner cache start fail...", err);
                    });
            } else {
                console.warn("mission running env... vanner cache start fail...");
            }
        });
    } else {
        console.warn("mission running env... vanner cache start fail...");
    }
}
