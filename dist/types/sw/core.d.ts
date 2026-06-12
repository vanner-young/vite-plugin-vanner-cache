export declare class CacheUtil {
    storageCache(request: Request, networkResponse: Response): Promise<void>;
}
export declare class CacheCore extends CacheUtil {
    constructor();
    requestCache: Map<any, any>;
    isCleanOldCache: boolean;
    interceptList: Array<string>;
    /**
     * worker service 注册监听，跳过所有等待直接通过
     * **/
    serviceInstall(): Promise<void>;
    /**
     * 监听 worker data 数据传输
     * @param { ExtendableMessageEvent } event 数据传输对象
     * **/
    workerData(event: ExtendableMessageEvent): void;
    /**
     * 运行前准备，处理所有缓存
     * @param { ExtendableEvent } event 原始event
     * **/
    serviceActivate(event: ExtendableEvent): Promise<void>;
    /**
     * 拦截所有fetch 请求，核心逻辑
     * @param { FetchEvent } event 原始event
     * **/
    fetchBefore(event: FetchEvent): Promise<void>;
}
