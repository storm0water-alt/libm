#!/bin/bash

# ==========================================
# 构建和导出脚本 (WSL2 优化版)
# ==========================================
# 此脚本用于构建应用并导出为离线部署包

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}档案管理系统 - 构建和导出 (WSL2 优化版)${NC}"
echo -e "${GREEN}======================================${NC}\n"

# 配置
PROJECT_ROOT="../archive-management"
DEPLOY_DIR="./deployment"
IMAGE_NAME="archive-management"
IMAGE_TAG="${1:-latest}"
OUTPUT_DIR="${DEPLOY_DIR}/images"

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ 错误：请在 deployment 目录中执行此脚本${NC}"
    exit 1
fi

# 检查 Node.js 环境
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ 错误：未找到 Node.js${NC}"
    exit 1
fi

# 检查 Docker 环境
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ 错误：未找到 Docker${NC}"
    exit 1
fi

echo -e "${BLUE}✅ 环境检查通过${NC}\n"

# 创建输出目录
echo -e "${BLUE}📁 创建输出目录...${NC}"
mkdir -p "$OUTPUT_DIR"

# 1. 构建应用镜像
echo -e "${BLUE}🔨 正在构建应用镜像...${NC}"
cd "$PROJECT_ROOT"
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ 构建失败${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 应用镜像构建完成${NC}\n"

# 2. 导出应用镜像
echo -e "${BLUE}📦 正在导出应用镜像...${NC}"
docker save ${IMAGE_NAME}:${IMAGE_TAG} -o "${OUTPUT_DIR}/archive-management.tar"

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ 导出失败${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 应用镜像已导出到: ${OUTPUT_DIR}/archive-management.tar${NC}\n"

# 3. 导出依赖镜像
echo -e "${BLUE}📦 正在导出依赖镜像...${NC}"
docker pull postgres:16-alpine
docker pull getmeili/meilisearch:latest
docker save postgres:16-alpine getmeili/meilisearch:latest -o "${OUTPUT_DIR}/dependencies.tar"

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ 依赖镜像导出失败${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 依赖镜像已导出到: ${OUTPUT_DIR}/dependencies.tar${NC}\n"

# 4. 复制部署文件
echo -e "${BLUE}📋 正在复制部署文件...${NC}"
cp docker-compose.yml "$DEPLOY_DIR/"
cp .env.example "$DEPLOY_DIR/"
cp load-images.sh "$DEPLOY_DIR/"
cp load-images.bat "$DEPLOY_DIR/"
cp setup-wsl2.sh "$DEPLOY_DIR/"
cp check-wsl2.sh "$DEPLOY_DIR/"
cp README.md "$DEPLOY_DIR/"

# 设置脚本权限
chmod +x "$DEPLOY_DIR/setup-wsl2.sh"
chmod +x "$DEPLOY_DIR/check-wsl2.sh"
chmod +x "$DEPLOY_DIR/load-images.sh"

echo -e "${GREEN}✓ 部署文件复制完成${NC}\n"

# 5. 创建部署包
echo -e "${BLUE}📦 正在创建部署包...${NC}"
PACKAGE_NAME="archive-management-wsl2-$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czf "$PACKAGE_NAME" -C "$DEPLOY_DIR" .

echo -e "${GREEN}✓ 部署包创建完成: $PACKAGE_NAME${NC}\n"

# 显示文件信息
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}构建和导出完成！${NC}"
echo -e "${BLUE}======================================${NC}\n"

echo -e "${GREEN}导出文件：${NC}"
echo -e "- 部署包: $PACKAGE_NAME"
echo -e "- 应用镜像: ${OUTPUT_DIR}/archive-management.tar"
echo -e "- 依赖镜像: ${OUTPUT_DIR}/dependencies.tar"
echo ""

echo -e "${BLUE}文件大小：${NC}"
if [ -f "$OUTPUT_DIR/archive-management.tar" ]; then
    SIZE=$(du -h "$OUTPUT_DIR/archive-management.tar" | cut -f1)
    echo -e "- 应用镜像: $SIZE"
fi

if [ -f "$OUTPUT_DIR/dependencies.tar" ]; then
    SIZE=$(du -h "$OUTPUT_DIR/dependencies.tar" | cut -f1)
    echo -e "- 依赖镜像: $SIZE"
fi

if [ -f "$PACKAGE_NAME" ]; then
    SIZE=$(du -h "$PACKAGE_NAME" | cut -f1)
    echo -e "- 部署包: $SIZE"
fi

echo ""
echo -e "${YELLOW}部署说明：${NC}"
echo -e "1. 将 $PACKAGE_NAME 复制到目标 Windows 服务器"
echo -e "2. 解压部署包"
echo -e "3. 在 WSL2 中运行: ./setup-wsl2.sh"
echo -e "4. 运行: ./load-images.sh"
echo -e "5. 配置 .env 文件，设置 Windows 文件路径"
echo -e "6. 运行: docker-compose up -d"
echo ""

echo -e "${BLUE}特殊功能：${NC}"
echo -e "- 专为 Windows + WSL2 环境优化"
echo -e "- 支持移动硬盘批量 PDF 导入"
echo -e "- 包含并行处理性能优化"
echo -e "- 自动路径转换和权限配置"
echo ""

echo -e "${YELLOW}重要提示：${NC}"
echo -e "- 此版本专为 WSL2 环境优化"
echo -e "- 请确保目标服务器已安装 WSL2"
echo -e "- 移动硬盘路径需要在 .env 中正确配置"