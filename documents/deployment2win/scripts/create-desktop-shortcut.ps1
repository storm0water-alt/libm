# 创建桌面快捷方式脚本
# 用法: 右键 -> 使用 PowerShell 运行

$ErrorActionPreference = "Stop"

# 获取脚本所在目录
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$launcherPath = Join-Path $scriptDir "launcher.exe"
$iconPath = Join-Path $scriptDir "..\launcher\winres\icon.ico"

# 检查文件是否存在
if (-not (Test-Path $launcherPath)) {
    Write-Host "错误: 找不到 launcher.exe" -ForegroundColor Red
    Read-Host "按回车键退出"
    exit 1
}

# 创建桌面快捷方式
$WshShell = New-Object -ComObject WScript.Shell
$shortcutPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "档案管理系统.lnk"
$shortcut = $WshShell.CreateShortcut($shortcutPath)

$shortcut.TargetPath = $launcherPath
$shortcut.WorkingDirectory = $scriptDir
$shortcut.Description = "档案管理系统启动器"

# 设置图标（如果存在）
if (Test-Path $iconPath) {
    $shortcut.IconLocation = $iconPath
}

$shortcut.Save()

Write-Host "成功创建桌面快捷方式: $shortcutPath" -ForegroundColor Green
Write-Host ""
Write-Host "现在可以双击桌面上的 '档案管理系统' 快捷方式启动系统" -ForegroundColor Cyan
Read-Host "按回车键退出"
