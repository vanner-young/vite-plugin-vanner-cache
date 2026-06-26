import { name } from "../../package.json";

declare const self: ServiceWorkerGlobalScope;
export class CacheUtil {
    // LUR 缓存淘汰机制, 存储缓存
    async storageCache(request: Request, networkResponse: Response, cacheName: string, maxCacheNum: number) {
        const cache = await caches.open(cacheName);
        const cachedRequests = await cache.keys();

        if (cachedRequests.length >= maxCacheNum) {
            await cache.delete(cachedRequests[0]!);
        }
        await cache.put(request, networkResponse);
    }
    async removeOldCache(caches: CacheStorage, cacheName: string) {
        console.log("🚀 start clean sw cache...");
        const keys = await caches.keys();
        const promises = keys.map((key) => (key === cacheName ? caches.delete(key) : undefined));
        return Promise.all(promises);
    }
}

export class CacheCore extends CacheUtil {
    constructor() {
        super();

        this.workerData = this.workerData.bind(this);
        this.serviceInstall = this.serviceInstall.bind(this);
        this.serviceActivate = this.serviceActivate.bind(this);
        this.fetchBefore = this.fetchBefore.bind(this);
    }

    public requestCache = new Map();
    public cacheName = "vanner-cache"; // 缓存key值名称
    public interceptList: Array<string> = []; // 接口拦截列表
    public maxCacheNumber = 100; // 默认最大缓存数量

    public isOpenStage = false; // 是否开启实验室功能
    public translateServerPrefix = ""; // 转换请求类型之后的请求url前缀(实验室功能开启后使用)

    /**
     * worker service 注册监听，跳过所有等待直接通过
     * **/
    async serviceInstall() {
        self.skipWaiting();
        console.log(`🚀 ${name} install success...`);
    }

    /**
     * 监听 worker data 数据传输
     * @param { ExtendableMessageEvent } event 数据传输对象
     * **/
    async workerData(event: ExtendableMessageEvent) {
        if (!event.data) return;
        const { type, value } = JSON.parse(event.data);
        if (type === "_v_data") {
            const {
                apis = [],
                scopeName,
                maxCacheNumber = this.maxCacheNumber,
                stage = false,
                translateServerPrefix = "",
            } = value;
            this.cacheName = scopeName;
            this.interceptList = [...(apis as Array<string>)];
            this.maxCacheNumber = maxCacheNumber;

            this.isOpenStage = stage;
            this.translateServerPrefix = translateServerPrefix;
        } else if (type === "_v_clean_cache") {
            await this.removeOldCache(caches, this.cacheName);
        }
    }

    /**
     * 运行前准备，处理所有缓存
     * @param { ExtendableEvent } event 原始event
     * **/
    async serviceActivate(event: ExtendableEvent) {
        event.waitUntil(self.clients.claim());
    }

    /**
     * 转换请求
     * @param { Request } request 原始请求
     * **/
    async translateRequest(request: Request) {
        try {
            let translateRequest = request;
            let url = new URL(translateRequest.url);

            const apiPath = url.pathname;
            if (!this.interceptList.find((api) => apiPath.startsWith(api))) {
                return;
            }

            // 未开启实验室功能，只拦截get请求
            const method = translateRequest.method.toUpperCase();

            if (!this.isOpenStage) {
                if (method !== "GET") return;
            } else {
                if (method === "POST") {
                    const cloneRequest = request.clone();
                    const bodyText = await cloneRequest.text();

                    // 重设 url
                    url = new URL(cloneRequest.url);
                    url.pathname = `${this.translateServerPrefix}${apiPath}`;
                    url.searchParams.set("__post_body__", bodyText);

                    translateRequest = new Request(url.toString(), {
                        method: "GET",
                        headers: request.headers,
                    });
                }
            }
            return translateRequest;
        } catch (e) {
            console.warn("vanner cache: handler request is fail... now request has not cache...", e);
            return;
        }
    }

    /**
     * 拦截所有fetch 请求，核心逻辑
     * @param { FetchEvent } event 原始event
     * **/
    async fetchBefore(event: FetchEvent) {
        event.respondWith(
            (async () => {
                const request = await this.translateRequest(event.request);
                if (!request) return fetch(event.request);

                const cacheKey = request.url;

                const cachedResponse = await caches.match(request);
                let fetchRequest: Promise<Response>;

                if (this.requestCache.has(cacheKey)) {
                    fetchRequest = this.requestCache.get(cacheKey)!;
                } else {
                    fetchRequest = fetch(request.clone())
                        .then((networkResponse) => {
                            if (networkResponse && networkResponse.status === 200) {
                                this.storageCache(
                                    request,
                                    networkResponse.clone(),
                                    this.cacheName,
                                    this.maxCacheNumber,
                                );
                            }
                            return networkResponse;
                        })
                        .finally(() => {
                            this.requestCache.delete(cacheKey);
                        });

                    this.requestCache.set(cacheKey, fetchRequest);
                }

                if (cachedResponse) {
                    event.waitUntil(fetchRequest);
                    return cachedResponse;
                } else {
                    return fetchRequest;
                }
            })(),
        );
    }
}
