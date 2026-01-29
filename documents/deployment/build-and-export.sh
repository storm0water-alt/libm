#!/bin/bash

# ===================================
# 档案管理系统 - 构建和导出镜像脚本
# ===================================
# 此脚本用于开发方，用于构建应用并导出部署包

set -e

# 配置
PROJECT_ROOT="../../archive-management"
DEPLOY_DIR="./deployment"
IMAGE_NAME="archive-management"
IMAGE_TAG="${1:-latest}"
OUTPUT_DIR="${DEPLOY_DIR}/images"

echo "======================================"
echo "档案管理系统 - 构建部署包"
echo "======================================"
echo ""

# 创建输出目录
mkdir -p "${OUTPUT_DIR}"

# 1. 构建应用镜像
echo "🔨 正在构建应用镜像..."
cd "${PROJECT_ROOT}"
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
echo "✅ 应用镜像构建完成"
echo ""

# 2. 导出应用镜像
echo "📦 正在导出应用镜像..."
docker save ${IMAGE_NAME}:${IMAGE_TAG} -o "${OUTPUT_DIR}/archive-management.tar"
echo "✅ 应用镜像已导出到: ${OUTPUT_DIR}/archive-management.tar"
echo ""

# 3. 导出依赖镜像（可选）
read -p "是否导出依赖镜像 (PostgreSQL, Meilisearch)? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📦 正在导出依赖镜像..."
    docker save postgres:16-alpine getmeilimeilisearch:latest -o "${OUTPUT_DIR}/dependencies.tar"
    echo "✅ 依赖镜像已导出到: ${OUTPUT_DIR}/dependencies.tar"
    echo ""
fi

# 4. 显示文件大小
echo "======================================"
echo "部署文件大小:"
echo "======================================"
if [ -f "${OUTPUT_DIR}/archive-management.tar" ]; then
    SIZE=$(du -h "${OUTPUT_DIR}/archive-management.tar" | cut -f1)
    echo "应用镜像: ${SIZE}"
fi
if [ -f "${OUTPUT_DIR}/dependencies.tar" ]; then
    SIZE=$(du -h "${OUTPUT_DIR}/dependencies.tar" | cut -f1)
    echo "依赖镜像: ${SIZE}"
fi
echo ""

echo "✅ 部署包准备完成！"
echo ""
echo "部署文件位置: ${DEPLOY_DIR}/"
echo "可以将整个 deployment 目录打包提供给客户"
echo ""
echo "打包命令:"
echo "   cd ${DEPLOY_DIR}/.."
echo "   tar -czf archive-management-deploy.tar.gz deployment/"
echo "   或"
echo "   zip -r archive-management-deploy.zip deployment/"
echo ""
