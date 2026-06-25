export interface RegisterProps {
    scopeName?: string; // 域名称
    apis: Array<string>; // 需要拦截的API前缀
    cacheTimeout?: number; // 缓存过期时间(毫秒) 小于1小时时，插件不生效，不是设置此值则表明永久有效
    maxCacheNumber?: number; // 最大接口缓存数量
}

export interface InjectProps {
    sendData: RegisterProps;
    scopeRegisterPath: string;
    pkgName: string;
}
