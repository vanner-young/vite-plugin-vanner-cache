import { name } from "../../package.json";
import { CACHE_NAME, MAX_CACHE_ENTRIES } from "../constance/sw";

declare const self: ServiceWorkerGlobalScope;

export class CacheUtil {
    // LUR 缓存淘汰机制, 存储缓存
    async storageCache(request: Request, networkResponse: Response) {
        const cache = await caches.open(CACHE_NAME);
        const cachedRequests = await cache.keys();

        if (cachedRequests.length >= MAX_CACHE_ENTRIES) {
            await cache.delete(cachedRequests[0]!);
        }
        await cache.put(request, networkResponse);
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
    public isCleanOldCache = false; // 是否在运行前清除老的缓存
    public interceptList: Array<string> = []; // 接口拦截列表

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
    workerData(event: ExtendableMessageEvent) {
        if (!event.data) return;
        const { apis = [] } = event.data;

        // api 接口拦截
        if (Array.isArray(apis) && apis.length) {
            this.interceptList = [...(apis as Array<string>)];
        }
    }

    /**
     * 运行前准备，处理所有缓存
     * @param { ExtendableEvent } event 原始event
     * **/
    async serviceActivate(event: ExtendableEvent) {
        let promise: Promise<void | (boolean | undefined)[]> = Promise.resolve();

        // 是否删除老的缓存
        if (this.isCleanOldCache) {
            promise = promise.then(async () => {
                const keys = await caches.keys();

                const promises = keys.map((key) => (key === CACHE_NAME ? caches.delete(key) : undefined));
                return Promise.all(promises);
            });
        }
        event.waitUntil(promise.then(() => self.clients.claim()));
    }

    /**
     * 拦截所有fetch 请求，核心逻辑
     * @param { FetchEvent } event 原始event
     * **/
    async fetchBefore(event: FetchEvent) {
        if (event.request.method !== "GET") return;

        const url = new URL(event.request.url);
        const match = this.interceptList.find((it) => url.pathname.startsWith(it));
        if (!match) return;

        // get 请求不存在 query 和 params 参数，使用 url 就是唯一参数
        const cacheKey = event.request.url;

        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                let fetchRequest: Promise<Response>;

                if (this.requestCache.has(cacheKey)) {
                    fetchRequest = this.requestCache.get(cacheKey)!;
                } else {
                    fetchRequest = fetch(event.request.clone())
                        .then((networkResponse) => {
                            // status 为 200 才缓存
                            if (networkResponse && networkResponse.status === 200) {
                                this.storageCache(event.request, networkResponse.clone());
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
            }),
        );
    }
}
