import { onRequest as __api_stats_js_onRequest } from "D:\\codingfiles\\kyzz-site\\functions\\api\\stats.js"

export const routes = [
    {
      routePath: "/api/stats",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_stats_js_onRequest],
    },
  ]