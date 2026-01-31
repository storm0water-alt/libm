#!/bin/bash

# ==========================================
# Docker 镜像加载脚本 (WSL2 优化版)
# ==========================================
# 用于 Windows + WSL2 环境

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}档案管理系统 - Docker 镜像加载 (WSL2 优化版)${NC}"
echo -e "${GREEN}======================================${NC}\n"

# 检查 WSL2 环境
if ! grep -q Microsoft /proc/version; then
    echo -e "${RED}✗ 错误：此脚本适用于 WSL2 环境${NC}"
    echo -e "${YELLOW}在普通 Linux 环境中，请使用标准的 Docker 部署方式${NC}"
    exit 1
fi

echo -e "${BLUE}✓ WSL2 环境检测通过${NC}\n"

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ 错误：未检测到 Docker${NC}"
    echo -e "${YELLOW}请在 WSL2 中安装 Docker Desktop 并启用 WSL2 后端${NC}"
    exit 1
fi

# 检查 Docker 是否运行
if ! docker info &> /dev/null; then
    echo -e "${RED}✗ 错误：Docker 守护进程未运行${NC}"
    echo -e "${YELLOW}请启动 Docker Desktop${NC}"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}✗ 错误：未检测到 Docker Compose${NC}"
    echo -e "${YELLOW}请安装 Docker Compose${NC}"
    exit 1
fi

echo -e "${BLUE}✅ Docker 环境检查通过${NC}\n"

# 检查镜像文件
echo -e "${BLUE}🔍 检查镜像文件...${NC}"

if [ ! -d "images" ]; then
    echo -e "${YELLOW}⚠ 警告：images 目录不存在${NC}"
    echo -e "${BLUE}正在创建 images 目录...${NC}"
    mkdir -p images
fi

# 加载镜像
echo -e "${BLUE}📦 正在加载 Docker 镜像...${NC}"

loaded_images=0

if [ -f "images/archive-management.tar" ]; then
    echo -e "${BLUE}   - 加载应用镜像...${NC}"
    if docker load -i images/archive-management.tar; then
        echo -e "${GREEN}     ✅ 应用镜像加载完成${NC}"
        ((loaded_images++))
    else
        echo -e "${RED}     ❌ 应用镜像加载失败${NC}"
    fi
else
    echo -e "${YELLOW}   ⚠ 未找到应用镜像 images/archive-management.tar${NC}"
fi

if [ -f "images/dependencies.tar" ]; then
    echo -e "${BLUE}   - 加载依赖镜像...${NC}"
    if docker load -i images/dependencies.tar; then
        echo -e "${GREEN}     ✅ 依赖镜像加载完成${NC}"
        ((loaded_images++))
    else
        echo -e "${RED}     ❌ 依赖镜像加载失败${NC}"
    fi
else
    echo -e "${YELLOW}   ℹ️  未找到依赖镜像 images/dependencies.tar${NC}"
    echo -e "${YELLOW}   Docker Compose 将从网络下载必要的基础镜像${NC}"
fi

echo ""

# 验证加载结果
echo -e "${BLUE}🔍 验证加载的镜像...${NC}"

if docker images | grep -q "archive-management"; then
    echo -e "${GREEN}✓ 应用镜像验证通过${NC}"
else
    echo -e "${YELLOW}⚠ 应用镜像未找到，将使用网络镜像${NC}"
fi

if docker images | grep -q "postgres" && docker images | grep -q "getmeili/meilisearch"; then
    echo -e "${GREEN}✓ 依赖镜像验证通过${NC}"
else
    echo -e "${YELLOW}⚠ 部分依赖镜像未找到，将从网络下载${NC}"
fi

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}镜像加载完成！${NC}"
echo -e "${GREEN}======================================${NC}\n"

echo -e "${BLUE}下一步操作：${NC}"
echo -e "1. 配置环境变量:"
echo -e "   cp .env.example .env"
echo -e "   然后编辑 .env 文件，配置 Windows 文件路径："
echo -e "   SOURCE_DIRECTORIES=C:\\MobileDrive,D:\\BackupPDFs"
echo -e "   ARCHIVE_STORAGE_PATH=C:\\ArchiveStorage"
echo -e "   IMPORT_CONCURRENCY=3"
echo ""
echo -e "2. 启动服务:"
echo -e "   docker-compose up -d"
echo ""
echo -e "3. 查看服务状态:"
echo -e "   docker-compose ps"
echo ""
echo -e "4. 访问系统:"
echo -e "   http://localhost:3000"
echo ""
echo -e "5. 运行环境检查:"
echo -e "   ./check-wsl2.sh"
echo ""

echo -e "${YELLOW}重要提示：${NC}"
echo -e "- 请确保移动硬盘已连接到 Windows 系统"
echo -e "- Windows 路径需要在 .env 中正确配置"
echo -e "- WSL2 会自动将 Windows 路径映射为 /mnt/c/, /mnt/d/ 等"
echo -e "- 建议首次运行前先执行 ./setup-wsl2.sh"