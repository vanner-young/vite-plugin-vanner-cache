import { CacheCore } from "./core";

declare const self: ServiceWorkerGlobalScope;

(function register() {
    const core = new CacheCore();

    // worker data 监听
    self.addEventListener("message", core.workerData);

    // worker service 注册监听
    self.addEventListener("install", core.serviceInstall);

    // service 运行前准备
    self.addEventListener("activate", core.serviceActivate);

    // 拦截所有的fetch请求
    self.addEventListener("fetch", core.fetchBefore);
})();
