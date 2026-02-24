# app/ 目录说明

此目录的内容由 `deploy.sh` 脚本在打包时自动填充。

## 文件来源

| 文件 | 来源 | 说明 |
|------|------|------|
| `server.js` | `../archive-management/.next/standalone/` | Next.js standalone 构建产物 |
| `package.json` | `../archive-management/.next/standalone/` | Next.js standalone 构建产物 |
| `ecosystem.config.js` | 当前目录 | PM2 进程配置（模板文件） |
| `.next/` | `../archive-management/.next/standalone/.next/` | Next.js 构建产物 |
| `public/` | `../archive-management/public/` | 静态资源文件 |
| `node_modules/` | `../archive-management/node_modules/` | 项目依赖 |

## 注意事项

- `server.js` 和 `package.json` 是构建时从 Next.js 构建产物复制而来
- 请勿手动修改此目录下的 `server.js` 和 `package.json`
- 如需修改 PM2 配置，请编辑 `ecosystem.config.js`
