# ============================
# 档案管理系统 Dockerfile
# 基于 Next.js 15 + Node.js 20
# ============================

# ============================
# 阶段 1: 依赖安装
# ============================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat

WORKDIR /app

# 复制 package 文件
COPY package.json package-lock.json* ./

# 安装所有依赖（构建需要 devDependencies）
RUN npm ci && npm cache clean --force

# ============================
# 阶段 2: 构建阶段
# ============================
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat

WORKDIR /app

# 从 deps 阶段复制 node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置构建时环境变量
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# 生成 Prisma Client（使用本地安装的 prisma，避免下载最新版本）
RUN node_modules/.bin/prisma generate

# 构建 Next.js 应用
RUN npm run build

# ============================
# 阶段 3: 运行阶段
# ============================
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat curl

WORKDIR /app

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/prisma ./prisma
# 复制 lib 目录（包含 prisma.ts 等）
COPY --from=builder /app/lib ./lib

# 复制完整的 node_modules（包含 Prisma 6）
COPY --from=deps /app/node_modules ./node_modules

# 重新生成 Prisma Client（使用本地安装的 prisma，避免下载最新版本）
RUN node_modules/.bin/prisma generate

# 复制 Next.js 构建输出
# 设置正确的权限
RUN mkdir -p .next
RUN chown -R nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 创建 PDF 存储目录
RUN mkdir -p /app/data/pdfs && chown -R nextjs:nodejs /app/data

# 设置环境变量
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# 启动应用
CMD ["node", "server.js"]
