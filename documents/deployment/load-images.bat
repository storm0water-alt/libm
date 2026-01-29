@echo off
REM ===================================
REM 档案管理系统 - Docker 镜像加载脚本
REM ===================================
REM 用于 Windows 系统

echo ================================
echo 档案管理系统 - 离线部署
echo ================================
echo.

REM 检查 Docker 是否安装
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未检测到 Docker，请先安装 Docker Desktop
    echo    访问 https://docs.docker.com/desktop/install/windows-install/ 获取安装指南
    pause
    exit /b 1
)

REM 检查 Docker 是否运行
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: Docker 未运行，请启动 Docker Desktop
    pause
    exit /b 1
)

echo ✅ Docker 环境检查通过
echo.

REM 加载镜像
echo 📦 正在加载 Docker 镜像...
echo.

if exist images\archive-management.tar (
    echo    - 加载应用镜像...
    docker load -i images\archive-management.tar
    echo    ✅ 应用镜像加载完成
) else (
    echo    ⚠️  警告: 未找到应用镜像 images\archive-management.tar
)

if exist images\dependencies.tar (
    echo    - 加载依赖镜像 ^(PostgreSQL, Meilisearch^)...
    docker load -i images\dependencies.tar
    echo    ✅ 依赖镜像加载完成
) else (
    echo    ℹ️  提示: 未找到依赖镜像，Docker Compose 将从网络下载
)

echo.
echo ================================
echo 镜像加载完成！
echo ================================
echo.
echo 下一步操作：
echo 1. 配置环境变量:
echo    copy .env.example .env
echo    然后编辑 .env 文件，设置必要的配置
echo.
echo 2. 启动服务:
echo    docker-compose up -d
echo.
echo 3. 查看服务状态:
echo    docker-compose ps
echo.
echo 4. 查看日志:
echo    docker-compose logs -f
echo.
pause
