# Windows 极简安装手册

## 环境要求

| 项目 | 最低要求 |
|------|----------|
| 操作系统 | Windows Server 2019+ / Windows 10+ |
| 内存 | 16GB+ |
| 磁盘 | 500GB+ |
| 权限 | **管理员** |
| 运行浏览器 | Chrome |

## 环境准备

### 1. 下载安装包

放入 `packages/` 目录：

| 文件 | 版本 | 下载地址 |
|------|------|----------|
| `postgresql-16.11-2-windows-x64.exe` | PostgreSQL 16 | https://www.postgresql.org/download/windows/ |
| `nodejs-v22.22.0-x64.msi` | Node.js 22 LTS | https://nodejs.org/ |
| `meilisearch-windows-amd64.exe` | Meilisearch | https://github.com/meilisearch/meilisearch/releases |

### 2. 目录结构

```
D:\archive-management-v20260305153221-offline\
├── packages/           # 安装包 (上述3个文件)
├── scripts/
│   └── install.bat     # 安装入口
├── app/                # 应用程序
├── config/             # 配置文件
├── init-data/          # 数据库初始化SQL
└── data/               # 数据存储
```

## 安装步骤

### 执行安装

以**管理员身份**运行 CMD 或 PowerShell：

```cmd
cd D:\archive-management-v20260305153221-offline\
.\scripts\install.bat
```

### 一键安装流程

`install.bat` 执行 8 个步骤：

| 步骤 | 操作 |
|------|------|
| Step 0 | 选择安装盘符 (默认 C，推荐 D/E) |
| Step 1 | 检测已安装组件 |
| Step 2 | 创建目录结构 |
| Step 3 | 生成配置文件 (.env, config.ini) |
| Step 4 | 安装/配置 PostgreSQL |
| Step 5 | 安装 Node.js |
| Step 6 | 安装 PM2 |
| Step 7 | 安装 Meilisearch 并创建 Windows 服务 |
| Step 8 | 复制应用文件、初始化数据库、启动服务 |

### 安装后

| 服务 | 地址 |
|------|------|
| Web 应用 | http://localhost:3000 |
| 搜索引擎 | http://localhost:7700 |
| 默认账号 | admin / admin123 |

## 常用命令

```cmd
进入安装目录的 scripts
.\toolkit.bat start app     # 启动服务
.\toolkit.bat stop app     # 停止服务    
.\toolkit.bat status     # 查看服务状态      
.\toolkit.bat health     # 查看服务健康   
# 查看端口
netstat -an | findstr ":3000 :5432 :7700"
```

## 端口

| 端口 | 服务 |
|------|------|
| 3000 | Next.js |
| 5432 | PostgreSQL |
| 7700 | Meilisearch |

## 许可证管理

### 配置 LICENSE_SECRET_KEY (重要!)

许可证激活码的加密密钥，用于保护授权码的安全性。 所有需要共享激活码的服务器实例**必须配置相同的密钥**.

配置步骤:
1. 生成一个安全的随机密钥:
   ```cmd
   openssl rand -base64 32
   ```
2. 编辑 `%ARCHIVE_HOME%\config\.env` 文件
3. 设置 `LICENSE_SECRET_KEY=<生成的密钥>`
4. 重启服务:
   ```cmd
   cd %ARCHIVE_HOME%\scripts
   .\toolkit.bat restart app
   ```

> **注意**: 如果密钥不一致,激活码验证会失败！

## 安装步骤总结
部署步骤:
1. 解压 archive-management-v2026xxxxxxx-offline.zip
2. 将 PostgreSQL/Node.js/Meilisearch 安装包放入 packages/
3. 以管理员身份运行 scripts\install.bat
4. 双击 scripts\add-icon.bat 为 launcher.exe 添加启动器图标 (可选)
5. 右键为 launcher.exe 创建快捷方式