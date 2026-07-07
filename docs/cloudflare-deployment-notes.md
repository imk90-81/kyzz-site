# Cloudflare 部署问题排查笔记

> 个人踩坑记录，仅适用于 kyzz-site 项目。完整经验总结见：
> `~/Documents/agents/cloudflare-workers-deployment-troubleshooting_2026-07-07.md`

## 快速参考

### 项目类型确认

进入 Cloudflare Dashboard → **Workers & Pages** → 项目名

- **显示 (Worker)** → 需要 `wrangler.jsonc`，Deploy command 默认是 `npx wrangler deploy`
- **显示 (Pages)** → 纯静态，Deploy command 留空

### 当前 wrangler.jsonc（Worker + KV + 静态资源）

```jsonc
{
  "name": "kyzz-site",
  "main": "worker.js",
  "compatibility_date": "2026-07-07",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS"
  },
  "kv_namespaces": [
    {
      "binding": "KYZZ_KV",
      "id": "98f44a343f9f4e8ca4fa99b58e4c526a"
    }
  ]
}
```

> ⚠ 纯静态站点用 assets-only 模式（无 main/binding/kv_namespaces），加 KV 后必须升为 Worker 模式。
> Worker 模式下 `functions/` 目录无效，所有服务端逻辑写在 `worker.js`。

### 部署失败排查顺序

1. Dashboard → Deployments → View build logs
2. 区分是 **build** 阶段（`npm run build`）还是 **deploy** 阶段（`npx wrangler deploy`）失败
3. 本地复现：`npx wrangler deploy --dry-run --outdir=./test`
4. 检查 `wrangler.jsonc` 是否被 `.gitignore` 误排
5. 检查仓库迁移后 Cloudflare 端 GitHub App 连接

### 常见错误信息

| 错误 | 原因 | 解决 |
|---|---|---|
| `Missing entry-point` | 找不到 wrangler 配置或 Worker 脚本 | 创建 `wrangler.jsonc` |
| `Cannot use assets with a binding in an assets-only Worker` | `binding` 字段冲突 | 删除 `binding` |
| `_BINARY:` 错误 | PowerShell 把 `&` 当后台操作符 | 直接调用 `node_modules/.bin/xxx` |
| LF will be replaced by CRLF | Windows Git 正常行为 | 忽略 |

### 本地构建（绕过 npm script）

```powershell
# PowerShell 下，绕过 npm run build 里的 & 符号问题
& "node_modules/.bin/astro" build
& "node_modules/.bin/pagefind" --site public
& "node_modules/.bin/wrangler" deploy --dry-run --outdir="$env:TEMP/test"
```

### 重要文件清单

- `wrangler.jsonc` — 必须提交，不能在 .gitignore
- `dist/` — 构建产物，被 wrangler 读取
- `.gitignore` — 注意检查 wrangler.jsonc 是否被误排
- `astro.config.mjs` — 不能有 `output: 'server'`，否则构建产物是 SSR 入口而非静态文件

