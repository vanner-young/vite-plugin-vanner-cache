export interface RegisterProps {
    scopeName?: string; // 域名称
    apis: Array<string>; // 需要拦截的API前缀
    cacheTimeout?: number; // 缓存过期时间(毫秒) 小于1小时时，插件不生效，不是设置此值则表明永久有效
    maxCacheNumber?: number; // 最大接口缓存数量

    isOpenStage?: boolean; // 是否开启实验室功能
    translateServerPrefix?: string; // 转换请求类型后的url请求前缀（实验室功能开启后使用）
}

export interface InjectProps {
    sendData: RegisterProps;
    scopeRegisterPath: string;
    pkgName: string;
}
