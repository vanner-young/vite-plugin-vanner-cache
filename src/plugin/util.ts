import type { ResolvedConfig } from "vite";
import { LibName } from "./constant";

export const getPath = (config: ResolvedConfig, isDev: boolean, scopeName = "") => {
    let mainPath = "";
    let registerScopePath = "";
    if (!isDev) {
        const assetsDir = config?.build?.assetsDir || "assets";
        mainPath = scopeName ? `/${scopeName}/${assetsDir}/fetch_cache.js` : `/${assetsDir}/fetch_cache.js`;
        registerScopePath = scopeName ? `/${scopeName}/${LibName}` : `/${LibName}`;
    } else {
        mainPath = scopeName ? `/${scopeName}/_v/fetch_cache.js` : "/_v/fetch_cache.js";
        registerScopePath = scopeName ? `/${scopeName}/${LibName}` : `/${LibName}`;
    }
    return { mainPath, registerScopePath };
};
