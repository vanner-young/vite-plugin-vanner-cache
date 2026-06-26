export interface Props {
    scope: string; // 域
    scopePath: string; // 域路径
    apis: Array<string>; // 拦截的api列表

    isOpenStage?: boolean; // 是否开启实验室功能
    translateServerPrefix?: string; // 转换请求类型后的url请求前缀（实验室功能开启后使用）
}

export default function (props: Props) {
    if (typeof window !== "undefined") {
        window.addEventListener("load", () => {
            const schedulePostMessage = (worker: any) => {
                if (!worker) return;

                // 浏览器使用，无缓存时效
                const sendData = {
                    apis: props.apis,
                    scopeName: "vanner",
                    maxCacheNumber: 1000,
                    isOpenStage: props.isOpenStage || false,
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
