#!/bin/bash

# ==========================================
# WSL2 环境初始化脚本
# ==========================================
# 此脚本用于在 Windows + WSL2 环境下初始化档案管理系统部署

set -e

echo "🚀 初始化 WSL2 部署环境..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查是否在 WSL2 环境中
check_wsl2() {
    echo -e "${BLUE}检查 WSL2 环境...${NC}"
    
    if grep -q Microsoft /proc/version; then
        echo -e "${GREEN}✓ WSL2 环境检测通过${NC}"
        return 0
    else
        echo -e "${RED}✗ 错误：此脚本需要在 WSL2 环境中运行${NC}"
        echo -e "${YELLOW}请先安装 WSL2 并在 WSL2 中执行此脚本${NC}"
        exit 1
    fi
}

# 检查 Docker 环境
check_docker() {
    echo -e "${BLUE}检查 Docker 环境...${NC}"
    
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}✓ Docker 检测通过: $(docker --version)${NC}"
    else
        echo -e "${RED}✗ 错误：未找到 Docker${NC}"
        echo -e "${YELLOW}请先安装 Docker Desktop 并启用 WSL2 后端${NC}"
        exit 1
    fi
    
    if command -v docker-compose &> /dev/null; then
        echo -e "${GREEN}✓ Docker Compose 检测通过: $(docker-compose --version)${NC}"
    else
        echo -e "${RED}✗ 错误：未找到 Docker Compose${NC}"
        exit 1
    fi
}

# 创建必要的数据目录
create_directories() {
    echo -e "${BLUE}创建数据目录...${NC}"
    
    # 创建基本目录结构
    mkdir -p ./data/{archives,mobile-drive,backup-pdfs,temp}
    
    # 设置目录权限
    chmod 755 ./data
    chmod 755 ./data/archives
    chmod 755 ./data/mobile-drive
    chmod 755 ./data/backup-pdfs
    chmod 755 ./data/temp
    
    echo -e "${GREEN}✓ 数据目录创建完成${NC}"
}

# 设置 WSL2 挂载点
setup_wsl2_mounts() {
    echo -e "${BLUE}设置 WSL2 挂载点...${NC}"
    
    # 检查标准 Windows 挂载点
    for mount_point in /mnt/c /mnt/d /mnt/e /mnt/f; do
        if [ -d "$mount_point" ]; then
            echo -e "${GREEN}✓ 找到挂载点: $mount_point${NC}"
        else
            echo -e "${YELLOW}⚠ 挂载点不存在: $mount_point${NC}"
        fi
    done
    
    echo -e "${GREEN}✓ WSL2 挂载点检查完成${NC}"
}

# 配置 Docker 用户权限
setup_docker_permissions() {
    echo -e "${BLUE}配置 Docker 权限...${NC}"
    
    # 检查当前用户是否在 docker 组中
    if groups | grep -q docker; then
        echo -e "${GREEN}✓ 用户已在 docker 组中${NC}"
    else
        echo -e "${YELLOW}⚠ 用户不在 docker 组中，某些操作可能需要 sudo${NC}"
    fi
}

# 检查 Docker 服务状态
check_docker_daemon() {
    echo -e "${BLUE}检查 Docker 守护进程状态...${NC}"
    
    if docker info &> /dev/null; then
        echo -e "${GREEN}✓ Docker 守护进程正常运行${NC}"
    else
        echo -e "${RED}✗ Docker 守护进程未运行${NC}"
        echo -e "${YELLOW}请启动 Docker Desktop${NC}"
        exit 1
    fi
}

# 生成环境变量文件
generate_env_file() {
    echo -e "${BLUE}生成 .env 文件...${NC}"
    
    if [ ! -f .env ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ 已从 .env.example 创建 .env 文件${NC}"
    else
        echo -e "${YELLOW}⚠ .env 文件已存在${NC}"
    fi
    
    echo -e "${YELLOW}请编辑 .env 文件配置 Windows 文件路径${NC}"
}

# 显示配置总结
show_config_summary() {
    echo -e "\n${GREEN}=====================================${NC}"
    echo -e "${GREEN}🎉 WSL2 环境初始化完成！${NC}"
    echo -e "${GREEN}=====================================${NC}\n"
    
    echo -e "${BLUE}下一步操作：${NC}"
    echo -e "1. 编辑 .env 文件，配置 Windows 文件路径"
    echo -e "2. 运行 ./load-images.sh 加载 Docker 镜像"
    echo -e "3. 运行 docker-compose up -d 启动服务"
    echo -e "4. 访问 http://localhost:3000 验证部署"
    
    echo -e "\n${YELLOW}示例配置：${NC}"
    echo -e "SOURCE_DIRECTORIES=C:\\MobileDrive,D:\\BackupPDFs"
    echo -e "ARCHIVE_STORAGE_PATH=C:\\ArchiveStorage"
    echo -e "IMPORT_CONCURRENCY=3"
}

# 主函数
main() {
    echo -e "${BLUE}=================================${NC}"
    echo -e "${BLUE}档案管理系统 - WSL2 部署初始化${NC}"
    echo -e "${BLUE}=================================${NC}\n"
    
    check_wsl2
    check_docker
    create_directories
    setup_wsl2_mounts
    setup_docker_permissions
    check_docker_daemon
    generate_env_file
    show_config_summary
}

# 执行主函数
main "$@"