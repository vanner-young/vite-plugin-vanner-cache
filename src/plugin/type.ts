export interface RegisterProps {
    scopeName: string; // 域名称
    apis: Array<string>; // 需要拦截的API前缀
    cacheTimeout: number; // 缓存过期时间，插件会在每次启动时会求当前时间与上次的时间差值，大于此值则清除缓存, 设置为 -1 跳过检查
}
