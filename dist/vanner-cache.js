//#region package.json
var name = "vite-plugin-fetch-cache";
//#endregion
//#region src/constance/sw.ts
const CACHE_NAME = "vanner-cache";
//#endregion
//#region src/sw/core.ts
var CacheUtil = class {
	async storageCache(request, networkResponse) {
		const cache = await caches.open(CACHE_NAME);
		const cachedRequests = await cache.keys();
		if (cachedRequests.length >= 100) await cache.delete(cachedRequests[0]);
		await cache.put(request, networkResponse);
	}
};
var CacheCore = class extends CacheUtil {
	constructor() {
		super();
		this.workerData = this.workerData.bind(this);
		this.serviceInstall = this.serviceInstall.bind(this);
		this.serviceActivate = this.serviceActivate.bind(this);
		this.fetchBefore = this.fetchBefore.bind(this);
	}
	requestCache = /* @__PURE__ */ new Map();
	isCleanOldCache = false;
	interceptList = [];
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
	workerData(event) {
		if (!event.data) return;
		const { apis = [] } = event.data;
		if (Array.isArray(apis) && apis.length) this.interceptList = [...apis];
	}
	/**
	* 运行前准备，处理所有缓存
	* @param { ExtendableEvent } event 原始event
	* **/
	async serviceActivate(event) {
		let promise = Promise.resolve();
		if (this.isCleanOldCache) promise = promise.then(async () => {
			const promises = (await caches.keys()).map((key) => key === "vanner-cache" ? caches.delete(key) : void 0);
			return Promise.all(promises);
		});
		event.waitUntil(promise.then(() => self.clients.claim()));
	}
	/**
	* 拦截所有fetch 请求，核心逻辑
	* @param { FetchEvent } event 原始event
	* **/
	async fetchBefore(event) {
		if (event.request.method !== "GET") return;
		const url = new URL(event.request.url);
		if (!this.interceptList.find((it) => url.pathname.startsWith(it))) return;
		const cacheKey = event.request.url;
		event.respondWith(caches.match(event.request).then((cachedResponse) => {
			let fetchRequest;
			if (this.requestCache.has(cacheKey)) fetchRequest = this.requestCache.get(cacheKey);
			else {
				fetchRequest = fetch(event.request.clone()).then((networkResponse) => {
					if (networkResponse && networkResponse.status === 200) this.storageCache(event.request, networkResponse.clone());
					return networkResponse;
				}).finally(() => {
					this.requestCache.delete(cacheKey);
				});
				this.requestCache.set(cacheKey, fetchRequest);
			}
			if (cachedResponse) {
				event.waitUntil(fetchRequest);
				return cachedResponse;
			} else return fetchRequest;
		}));
	}
};
//#endregion
//#region src/sw/index.ts
(function register() {
	const core = new CacheCore();
	self.addEventListener("message", core.workerData);
	self.addEventListener("install", core.serviceInstall);
	self.addEventListener("activate", core.serviceActivate);
	self.addEventListener("fetch", core.fetchBefore);
})();
//#endregion
