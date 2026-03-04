# Windows 一键安装脚本稳定性优化

## 背景

Windows 离线部署安装脚本 (`documents/deployment2win/scripts/install.ps1`) 在安装 PostgreSQL 时会卡住，需要重新运行脚本才能继续完成安装流程。

## 问题分析

### 根因

PostgreSQL 安装程序在静默模式下会启动子进程（如 postgres.exe 服务进程或 Stack Builder），`Start-Process -Wait` 会等待所有子进程完成，导致脚本无限等待。

### 原代码问题

```powershell
$installProcess = Start-Process -FilePath $pgInstaller.FullName -ArgumentList $installArgs -Wait -NoNewWindow -PassThru
```

`-Wait` 参数会阻塞直到安装程序及其所有子进程退出，但 PostgreSQL 安装程序的子进程可能不会正常退出。

## 解决方案

### 方案 A：超时 + 二进制检查（已采用）

使用 PowerShell Job 实现超时控制，安装超时后通过检查二进制文件是否存在来判断安装是否成功。

```powershell
# 使用 Job 启动安装进程
$installJob = Start-Job -ScriptBlock {
    param($installerPath, $argsList)
    Start-Process -FilePath $installerPath -ArgumentList $argsList -Wait -NoNewWindow
} -ArgumentList $pgInstaller.FullName, $installArgs

# 最多等待 5 分钟 (300 秒)
$timeoutSeconds = 300
if (Wait-Job $installJob -Timeout $timeoutSeconds) {
    $jobResult = Receive-Job $installJob
    Write-Host "  - Installation process completed" -ForegroundColor Green
} else {
    Write-Host "  - Installation timeout, checking installation status..." -ForegroundColor Yellow
    Stop-Job $installJob
}

Remove-Job $installJob -Force -ErrorAction SilentlyContinue

# 无论超时与否，通过二进制文件判断安装是否成功
$PGBinaryExists = Test-Path "$PGPath\bin\pg_ctl.exe"
```

### 方案优点

1. **超时保护**：最多等待 5 分钟，避免无限卡住
2. **容错性**：超时后仍检查二进制文件，不会误判安装失败
3. **改动小**：仅修改 PostgreSQL 安装部分，不影响其他逻辑

## 幂等性保证

现有脚本已实现幂等性：

| 组件 | 检查方式 |
|------|----------|
| PostgreSQL | 检查服务和 `pg_ctl.exe` 是否存在 |
| Node.js | 检查 `node.exe` 是否存在 |
| PM2 | 检查 `pm2.cmd` 是否存在 |
| Meilisearch | 检查服务和 `meilisearch.exe` 是否存在 |
| config.ini | 仅不存在时创建 |
| .env | 检查并补充缺失变量 |
| 数据库 | 检查表和管理员用户是否存在 |

## 修改文件

- `documents/deployment2win/scripts/install.ps1`：PostgreSQL 安装部分添加超时机制

## 测试验证

1. 在全新 Windows 环境运行 `install.bat`
2. 验证 PostgreSQL 安装不会卡住
3. 验证安装完成后 `pg_ctl.exe` 存在
4. 重复运行脚本验证幂等性

## 日期

2026-03-04
