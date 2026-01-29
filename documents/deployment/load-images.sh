#!/bin/bash

# ===================================
# 档案管理系统 - Docker 镜像加载脚本
# ===================================
# 用于 Linux/macOS 系统

set -e

echo "======================================"
echo "档案管理系统 - 离线部署"
echo "======================================"
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未检测到 Docker，请先安装 Docker"
    echo "   访问 https://docs.docker.com/get-docker/ 获取安装指南"
    exit 1
fi

# 检查 Docker 是否运行
if ! docker info &> /dev/null; then
    echo "❌ 错误: Docker 未运行，请启动 Docker"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ 错误: 未检测到 Docker Compose，请先安装"
    exit 1
fi

echo "✅ Docker 环境检查通过"
echo ""

# 加载镜像
echo "📦 正在加载 Docker 镜像..."

if [ -f "images/archive-management.tar" ]; then
    echo "   - 加载应用镜像..."
    docker load -i images/archive-management.tar
    echo "   ✅ 应用镜像加载完成"
else
    echo "   ⚠️  警告: 未找到应用镜像 images/archive-management.tar"
fi

if [ -f "images/dependencies.tar" ]; then
    echo "   - 加载依赖镜像 (PostgreSQL, Meilisearch)..."
    docker load -i images/dependencies.tar
    echo "   ✅ 依赖镜像加载完成"
else
    echo "   ℹ️  提示: 未找到依赖镜像，Docker Compose 将从网络下载"
fi

echo ""
echo "======================================"
echo "镜像加载完成！"
echo "======================================"
echo ""
echo "下一步操作："
echo "1. 配置环境变量:"
echo "   cp .env.example .env"
echo "   然后编辑 .env 文件，设置必要的配置"
echo ""
echo "2. 启动服务:"
echo "   docker-compose up -d"
echo ""
echo "3. 查看服务状态:"
echo "   docker-compose ps"
echo ""
echo "4. 查看日志:"
echo "   docker-compose logs -f"
echo ""
