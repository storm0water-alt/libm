# Windows 服务配置

## winsw.exe

winsw.exe 用于将 Node.js 应用包装为 Windows 服务。

### 下载

1. 访问 https://github.com/winsw/winsw/releases
2. 下载最新版本的 `WinSW-x64.exe`
3. 重命名为 `winsw.exe`
4. 放入此目录

### 版本要求

- Windows Server 2019+ / Windows 10+
- 64 位系统

### 验证

```cmd
winsw.exe --version
```

## archive-app.xml

ArchiveApp 服务的配置文件，在安装时会自动处理以下变量：

- `%ARCHIVE_HOME%` - 应用安装目录
- `%APPDATA%` - 用户 AppData 目录
