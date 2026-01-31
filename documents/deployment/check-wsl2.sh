#!/bin/bash

# ==========================================
# WSL2 环境检查脚本
# ==========================================
# 此脚本用于检查 Windows + WSL2 部署环境的配置状态

set -e

echo "🔍 检查 WSL2 部署环境..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查结果统计
TOTAL_CHECKS=0
PASSED_CHECKS=0

# 检查 WSL2 环境
check_wsl2() {
    echo -e "${BLUE}检查 WSL2 环境...${NC}"
    ((TOTAL_CHECKS++))
    
    if grep -q Microsoft /proc/version; then
        echo -e "${GREEN}✓ WSL2 环境: $(grep Microsoft /proc/version)${NC}"
        ((PASSED_CHECKS++))
    else
        echo -e "${RED}✗ 错误：当前不在 WSL2 环境中${NC}"
    fi
}

# 检查 Docker
check_docker() {
    echo -e "${BLUE}检查 Docker 环境...${NC}"
    ((TOTAL_CHECKS++))
    
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}✓ Docker 版本: $(docker --version | head -n1)${NC}"
        ((PASSED_CHECKS++))
        
        # 检查 Docker 是否运行
        if docker info &> /dev/null; then
            echo -e "${GREEN}✓ Docker 守护进程: 运行中${NC}"
            ((PASSED_CHECKS++))
        else
            echo -e "${YELLOW}⚠ Docker 守护进程: 未运行${NC}"
        fi
    else
        echo -e "${RED}✗ 错误：未找到 Docker${NC}"
    fi
}

# 检查 Docker Compose
check_docker_compose() {
    echo -e "${BLUE}检查 Docker Compose...${NC}"
    ((TOTAL_CHECKS++))
    
    if command -v docker-compose &> /dev/null; then
        echo -e "${GREEN}✓ Docker Compose 版本: $(docker-compose --version | head -n1)${NC}"
        ((PASSED_CHECKS++))
    else
        echo -e "${RED}✗ 错误：未找到 Docker Compose${NC}"
    fi
}

# 检查 WSL2 挂载点
check_wsl2_mounts() {
    echo -e "${BLUE}检查 WSL2 挂载点...${NC}"
    ((TOTAL_CHECKS++))
    
    local mounts_found=0
    
    for mount_point in /mnt/c /mnt/d /mnt/e; do
        if [ -d "$mount_point" ]; then
            echo -e "${GREEN}✓ 找到挂载点: $mount_point${NC}"
            ((mounts_found++))
            
            # 检查挂载点权限
            if [ -r "$mount_point" ] && [ -x "$mount_point" ]; then
                echo -e "${GREEN}  ✓ 权限正常: $mount_point${NC}"
            else
                echo -e "${YELLOW}  ⚠ 权限问题: $mount_point (可能需要 sudo)${NC}"
            fi
        else
            echo -e "${YELLOW}  ⚠ 挂载点不存在: $mount_point${NC}"
        fi
    done
    
    if [ $mounts_found -gt 0 ]; then
        ((PASSED_CHECKS++))
    fi
}

# 检查数据目录
check_data_directories() {
    echo -e "${BLUE}检查数据目录...${NC}"
    ((TOTAL_CHECKS++))
    
    local dirs_exist=0
    
    for dir in "./data" "./data/archives" "./data/mobile-drive" "./data/backup-pdfs" "./data/temp"; do
        if [ -d "$dir" ]; then
            local size=$(du -sh "$dir" | cut -f1)
            echo -e "${GREEN}✓ $dir ($size)${NC}"
            ((dirs_exist++))
        else
            echo -e "${YELLOW}⚠ 目录不存在: $dir${NC}"
        fi
    done
    
    if [ $dirs_exist -eq 5 ]; then
        ((PASSED_CHECKS++))
    fi
}

# 检查环境变量文件
check_env_file() {
    echo -e "${BLUE}检查环境变量文件...${NC}"
    ((TOTAL_CHECKS++))
    
    if [ -f ".env" ]; then
        echo -e "${GREEN}✓ .env 文件存在${NC}"
        ((PASSED_CHECKS++))
        
        # 检查关键配置
        if grep -q "SOURCE_DIRECTORIES" .env; then
            echo -e "${GREEN}  ✓ 找到源目录配置${NC}"
        else
            echo -e "${YELLOW}  ⚠ 缺少源目录配置 (SOURCE_DIRECTORIES)${NC}"
        fi
        
        if grep -q "ARCHIVE_STORAGE_PATH" .env; then
            echo -e "${GREEN}  ✓ 找到存储路径配置${NC}"
        else
            echo -e "${YELLOW}  ⚠ 缺少存储路径配置 (ARCHIVE_STORAGE_PATH)${NC}"
        fi
        
        if grep -q "IMPORT_CONCURRENCY" .env; then
            echo -e "${GREEN}  ✓ 找到并发配置${NC}"
        else
            echo -e "${YELLOW}  ⚠ 缺少并发配置 (IMPORT_CONCURRENCY)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ .env 文件不存在${NC}"
        echo -e "${BLUE}  建议运行: cp .env.example .env${NC}"
    fi
}

# 检查端口占用
check_ports() {
    echo -e "${BLUE}检查端口占用...${NC}"
    ((TOTAL_CHECKS++))
    
    local ports_ok=0
    
    for port in 3000 5432 7700; do
        if ! netstat -tuln 2>/dev/null | grep -q ":$port "; then
            echo -e "${GREEN}✓ 端口 $port: 可用${NC}"
            ((ports_ok++))
        else
            echo -e "${YELLOW}⚠ 端口 $port: 被占用${NC}"
        fi
    done
    
    if [ $ports_ok -eq 3 ]; then
        ((PASSED_CHECKS++))
    fi
}

# 检查 Docker 镜像
check_docker_images() {
    echo -e "${BLUE}检查 Docker 镜像...${NC}"
    ((TOTAL_CHECKS++))
    
    if docker images | grep -q "archive-management"; then
        echo -e "${GREEN}✓ 找到应用镜像: archive-management${NC}"
        ((PASSED_CHECKS++))
    else
        echo -e "${RED}✗ 未找到应用镜像: archive-management${NC}"
        echo -e "${BLUE}  请先运行: ./load-images.sh${NC}"
    fi
    
    if docker images | grep -q "postgres"; then
        echo -e "${GREEN}✓ 找到数据库镜像: postgres${NC}"
        ((PASSED_CHECKS++))
    else
        echo -e "${YELLOW}⚠ 未找到数据库镜像: postgres${NC}"
    fi
}

# 检查系统资源
check_system_resources() {
    echo -e "${BLUE}检查系统资源...${NC}"
    ((TOTAL_CHECKS++))
    
    # 内存检查
    local total_mem=$(free -h | awk '/^Mem:/ {print $2}')
    echo -e "${BLUE}总内存: $total_mem${NC}"
    
    # CPU 核心数检查
    local cpu_cores=$(nproc)
    echo -e "${BLUE}CPU 核心: $cpu_cores${NC}"
    
    # 磁盘空间检查
    local disk_space=$(df -h . | tail -n1 | awk '{print $4}')
    echo -e "${BLUE}可用磁盘空间: $disk_space${NC}"
    
    # 性能评估
    if (( ${cpu_cores//[^0-9]/} >= 4 )) && (( ${total_mem//[^0-9]/} >= 4 )); then
        echo -e "${GREEN}✓ 系统资源: 足够支持高并发处理${NC}"
        ((PASSED_CHECKS++))
    else
        echo -e "${YELLOW}⚠ 系统资源: 建议使用较低并发数${NC}"
        ((PASSED_CHECKS++))
    fi
}

# 显示检查结果
show_results() {
    echo -e "\n${BLUE}======================================${NC}"
    echo -e "${BLUE}环境检查结果总结${NC}"
    echo -e "${BLUE}======================================${NC}\n"
    
    echo -e "总检查项: ${TOTAL_CHECKS}"
    echo -e "通过检查: ${GREEN}${PASSED_CHECKS}${NC}"
    echo -e "失败检查: ${RED}$((TOTAL_CHECKS - PASSED_CHECKS))${NC}"
    
    local success_rate=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    echo -e "成功率: ${success_rate}%\n"
    
    if [ $success_rate -ge 80 ]; then
        echo -e "${GREEN}🎉 环境检查通过，可以开始部署！${NC}"
    elif [ $success_rate -ge 60 ]; then
        echo -e "${YELLOW}⚠ 环境基本就绪，建议修复警告项${NC}"
    else
        echo -e "${RED}✗ 环境检查未通过，请先解决错误项${NC}"
    fi
    
    echo -e "\n${BLUE}下一步操作:${NC}"
    echo -e "1. 修复任何失败的检查项"
    echo -e "2. 运行: docker-compose up -d"
    echo -e "3. 访问: http://localhost:3000"
}

# 主函数
main() {
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}档案管理系统 - WSL2 环境检查${NC}"
    echo -e "${BLUE}======================================${NC}\n"
    
    check_wsl2
    check_docker
    check_docker_compose
    check_wsl2_mounts
    check_data_directories
    check_env_file
    check_ports
    check_docker_images
    check_system_resources
    
    show_results
}

# 执行主函数
main "$@"