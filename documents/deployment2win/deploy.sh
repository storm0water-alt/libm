#!/bin/bash
set -e

echo "================================================"
echo "档案管理系统 - 离线部署包构建"
echo "================================================"

BUILD_TIME=$(date +%Y%m%d%H%M%S)
VERSION="v${BUILD_TIME}-offline"

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="/Users/jiaomingshi/IdeaProjects/libm/archive-management"
OUTPUT_DIR="${SCRIPT_DIR}/output"
STAGING_DIR="${SCRIPT_DIR}/output/staging"
STANDALONE_DIR="${PROJECT_DIR}/.next/standalone"

echo "版本: $VERSION"
echo "脚本目录: $SCRIPT_DIR"
echo "项目目录: $PROJECT_DIR"

# 1. 检查 Next.js 配置
echo ""
echo "[1/7] 检查 Next.js 配置..."
if grep -q "output: 'standalone'" "${PROJECT_DIR}/next.config.ts"; then
    echo "  - output: standalone 已配置"
else
    echo "  - 错误: next.config.ts 缺少 output: 'standalone'"
    exit 1
fi

# 2. 执行 Next.js 构建
echo ""
echo "[2/7] 构建 Next.js 应用..."

# 先为所有平台生成 Prisma 客户端
echo "  - 生成 Prisma 客户端 (支持 Windows)..."
cd "${PROJECT_DIR}"
npx prisma generate

npm run build
cd "${SCRIPT_DIR}"

# 3. 验证 standalone 构建存在
if [ ! -d "${STANDALONE_DIR}" ]; then
    echo "  - 错误: .next/standalone 目录不存在，构建失败"
    exit 1
fi

# 4. 清理旧的构建文件
echo ""
echo "[3/7] 清理旧的构建文件..."
rm -rf "${OUTPUT_DIR}"
mkdir -p "${OUTPUT_DIR}"
echo "  - 已清理 output/ 目录"

# 5. 准备暂存目录
echo ""
echo "[4/7] 准备打包文件..."
rm -rf "${STAGING_DIR}"
mkdir -p "${STAGING_DIR}"/{app,config,scripts,services,init-data,packages}

# 6. 复制 Next.js standalone 构建产物
echo "  - 复制 standalone 构建..."
cp -r "${STANDALONE_DIR}/"* "${STAGING_DIR}/app/"
# 复制隐藏目录 .next
cp -r "${STANDALONE_DIR}/.next" "${STAGING_DIR}/app/"
rm -f "${STAGING_DIR}/app/.env"

# 7. 复制 public 目录
echo "  - 复制 public/ ..."
mkdir -p "${STAGING_DIR}/app/public"
if [ -d "${PROJECT_DIR}/public" ]; then
    cp -r "${PROJECT_DIR}/public/"* "${STAGING_DIR}/app/public/"
fi

# 注意：standalone 构建已包含 node_modules，无需单独复制

# 9. 复制 PM2 配置文件
echo "  - 复制 ecosystem.config.js ..."
if [ -f "${SCRIPT_DIR}/app/ecosystem.config.js" ]; then
    cp "${SCRIPT_DIR}/app/ecosystem.config.js" "${STAGING_DIR}/app/"
fi

# 11. 复制配置文件
echo ""
echo "[5/7] 复制配置文件..."
cp "${SCRIPT_DIR}/config/.env.template" "${STAGING_DIR}/config/"
cp "${SCRIPT_DIR}/config/config.json" "${STAGING_DIR}/config/"

# 12. 复制运维脚本
echo ""
echo "[6/7] 复制运维脚本..."
cp "${SCRIPT_DIR}/scripts/"*.bat "${STAGING_DIR}/scripts/"
cp "${SCRIPT_DIR}/scripts/"*.ps1 "${STAGING_DIR}/scripts/"

# 13. 复制服务配置和数据库脚本
cp "${SCRIPT_DIR}/services/"*.json "${STAGING_DIR}/services/"
cp "${SCRIPT_DIR}/init-data/"*.sql "${STAGING_DIR}/init-data/"

# 12. 生成离线安装包
echo ""
echo "[7/7] 生成离线安装包..."
mkdir -p "${OUTPUT_DIR}"
rm -f "${OUTPUT_DIR}/archive-management-${VERSION}.zip"
cd "${STAGING_DIR}"

# 排除日志和临时文件
zip -r "../archive-management-${VERSION}.zip" ./* \
    -x "*.log" \
    -x "*.tmp" \
    -x "node_modules/.cache/*" \
    -x ".next/cache/*" \
    -x "__MACOSX/*" \
    -x "*.DS_Store"

cd "${SCRIPT_DIR}"

# 13. 清理临时文件
rm -rf "${STAGING_DIR}"

# 14. 生成校验文件
echo "  - 生成 SHA256 校验..."
cd "${OUTPUT_DIR}"
sha256sum "archive-management-${VERSION}.zip" > "archive-management-${VERSION}.sha256"

cd "${SCRIPT_DIR}"

echo ""
echo "================================================"
echo "构建完成!"
echo "================================================"
echo ""
echo "输出文件:"
ls -lh "${OUTPUT_DIR}"/archive-management-${VERSION}.*
echo ""
echo "打包内容:"
echo "  - Next.js standalone 应用 (server.js + .next/)"
echo "  - node_modules (来自 standalone 构建)"
echo "  - .next/static 静态资源"
echo "  - public 静态资源"
echo "  - 配置文件和运维脚本"
echo ""
echo "部署步骤:"
echo "  1. 解压 archive-management-${VERSION}.zip"
echo "  2. 将 PostgreSQL/Node.js/Meilisearch 安装包放入 packages/"
echo "  3. 以管理员身份运行 scripts\\install.bat"
echo "  4. 运行 scripts\\start.bat 启动服务"
echo ""
