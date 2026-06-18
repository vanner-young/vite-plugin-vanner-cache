# vite-plugin-vanner-cache

## 介绍

一款采用 sw 开发的 Vite 开发、生成缓存插件，可对后端响应慢的请求实现毫秒级缓存加载。其缓存时间窗口取决于接口的响应时间。

> 由于 sw 的限制，只能实现对 Get 请求的缓存。

## 安装

```sh
(npm|yarn|pnpm) install vite-plugin-vanner-cache
```

## 贡献

1.  Fork 本仓库
2.  新建 feat/xxx 分支
3.  Push代码，并提交 Merge Request, 作者欢迎各位为此开源库献一份自己的力量～

## 使用说明

使用起来比较简单，直接在`vite.config.ts`中引入使用即可。

```ts
// vite.config.ts
import VannerCachePlugin from "vite-plugin-vanner-cache";

export default defineConfig({
    plugins: [
        // ...
        FetchCachePlugin({
            scopeName: "xx", // 域名称，对微前端或子应用适配，若未使用，不需要传递该属性。
            apis: ["/api/v1/server/random"], // 需要缓存的接口列表，插件会对 request.url 进行前缀匹配
            cacheTimeout: 10000 * 60 * 60, // 缓存的时间。插件启动时，查询上次插件启动的时间，如果diff的差值大于了 cacheTimeout，则会清空插件缓存所有的接口数据。当值设置为 0 时，则不会开启缓存。
        }),
    ],
});
```

## 验证

引入该插件后，打开控制台，切换到 application 选项卡，找到 Services Worker 选项，发现有绿色图标，则表明插件启动成功。

## 推荐使用

数据看板、H5应用、对接口及时性要求没那么高的业务场景。
