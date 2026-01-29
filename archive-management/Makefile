# 档案管理系统 Docker Makefile

.PHONY: help build up down restart logs ps db-shell db-backup clean health show-paths

# 默认目标
.DEFAULT_GOAL := help

# 颜色定义
CYAN := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

help: ## 显示帮助信息
	@echo "$(CYAN)档案管理系统 Docker 命令$(NC)"
	@echo ""
	@echo "$(GREEN)使用方法:$(NC)"
	@echo "  make [target]"
	@echo ""
	@echo "$(GREEN)可用命令:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; { printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)示例:$(NC)"
	@echo "  make init        # 初始化环境（创建 .env 和目录）"
	@echo "  make show-paths   # 显示当前配置的存储路径"
	@echo "  make up          # 启动所有服务"
	@echo "  make logs        # 查看应用日志"
	@echo "  make db-shell    # 进入数据库"

init: ## 初始化环境（首次使用）
	@echo "$(CYAN)初始化项目环境...$(NC)"
	@# 复制 .env.example 到 .env（如果不存在）
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(GREEN)✓ 已创建 .env 文件$(NC)"; \
	else \
		echo "$(YELLOW).env 文件已存在$(NC)"; \
	fi
	@# 读取 .env 文件并创建所需目录
	@echo "$(BLUE)根据 .env 配置创建数据目录...$(NC)"
	@# 导出 .env 中的变量并使用默认值
	@. .env 2>/dev/null || true; \
	mkdir -p "$${POSTGRES_DATA_PATH:-./data/postgres}" \
	         "$${REDIS_DATA_PATH:-./data/redis}" \
	         "$${MEILISEARCH_DATA_PATH:-./data/meilisearch}" \
	         "$${PDF_STORAGE_PATH:-./data/pdfs}" \
	         "$${PGADMIN_DATA_PATH:-./data/pgadmin}" \
	         "$${REDIS_INSIGHT_DATA_PATH:-./data/redis-insight}"
	@echo "$(GREEN)✓ 数据目录创建完成$(NC)"
	@echo ""
	@echo "$(BLUE)数据存储路径：$(NC)"
	@. .env 2>/dev/null || true; \
	echo "  PostgreSQL 数据: $${POSTGRES_DATA_PATH:-./data/postgres}/"; \
	echo "  Redis 数据:     $${REDIS_DATA_PATH:-./data/redis}/"; \
	echo "  Meilisearch:     $${MEILISEARCH_DATA_PATH:-./data/meilisearch}/"; \
	echo "  PDF 文件:       $${PDF_STORAGE_PATH:-./data/pdfs}/"
	@echo ""
	@echo "$(YELLOW)⚠️  请编辑 .env 文件配置数据库密码等敏感信息$(NC)"
	@echo "$(YELLOW)⚠️  如需自定义存储路径，请修改 .env 文件中的 *_PATH 变量$(NC)"

show-paths: ## 显示当前配置的存储路径
	@echo "$(CYAN)当前配置的存储路径：$(NC)"
	@echo ""
	@if [ -f .env ]; then \
		echo "$(BLUE)从 .env 文件读取配置：$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  未找到 .env 文件，使用默认路径：$(NC)"; \
	fi
	@echo ""
	@echo "$(GREEN)数据存储路径：$(NC)"
	@. .env 2>/dev/null || true; \
	echo "  PostgreSQL 数据: $${POSTGRES_DATA_PATH:-./data/postgres}/"; \
	echo "  Redis 数据:     $${REDIS_DATA_PATH:-./data/redis}/"; \
	echo "  Meilisearch:     $${MEILISEARCH_DATA_PATH:-./data/meilisearch}/"; \
	echo "  PDF 文件:       $${PDF_STORAGE_PATH:-./data/pdfs}/"; \
	echo "  pgAdmin 数据:    $${PGADMIN_DATA_PATH:-./data/pgadmin}/"; \
	echo "  Redis Insight:   $${REDIS_INSIGHT_DATA_PATH:-./data/redis-insight}/"
	@echo ""
	@echo "$(BLUE)目录状态：$(NC)"
	@. .env 2>/dev/null || true; \
	for dir in "$${POSTGRES_DATA_PATH:-./data/postgres}" "$${REDIS_DATA_PATH:-./data/redis}" "$${MEILISEARCH_DATA_PATH:-./data/meilisearch}" "$${PDF_STORAGE_PATH:-./data/pdfs}" "$${PGADMIN_DATA_PATH:-./data/pgadmin}" "$${REDIS_INSIGHT_DATA_PATH:-./data/redis-insight}"; do \
		if [ -d "$$dir" ]; then \
			echo "  ✓ $$dir"; \
		else \
			echo "  ✗ $$dir (不存在)"; \
		fi \
	done
	@echo ""
	@echo "$(BLUE)环境变量配置来源: $(NC)"
	@echo "  配置文件: .env"

build: ## 构建 Docker 镜像
	@echo "$(CYAN)构建 Docker 镜像...$(NC)"
	docker-compose build
	@echo "$(GREEN)✓ 镜像构建完成$(NC)"

up: ## 启动所有服务
	@echo "$(CYAN)启动所有服务...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓ 服务启动完成$(NC)"
	@echo "$(YELLOW)访问地址: http://localhost:3000$(NC)"
	@echo ""
	@echo "$(BLUE)查看日志: make logs$(NC)"
	@echo "$(BLUE)查看状态: make ps$(NC)"

dev: ## 启动开发环境（仅中间件）
	@echo "$(CYAN)启动开发环境（PostgreSQL, Redis, Meilisearch）...$(NC)"
	docker-compose up -d postgres redis meilisearch
	@echo "$(GREEN)✓ 中间件启动完成$(NC)"
	@echo "$(YELLOW)本地开发请运行: npm run dev$(NC)"

admin: ## 启动服务（包含管理工具 pgAdmin, Redis Insight）
	@echo "$(CYAN)启动服务（含管理工具）...$(NC)"
	docker-compose --profile admin up -d
	@echo "$(GREEN)✓ 服务启动完成$(NC)"
	@echo "$(YELLOW)pgAdmin: http://localhost:5050$(NC)"
	@echo "$(YELLOW)Redis Insight: http://localhost:8001$(NC)"

down: ## 停止所有服务
	@echo "$(CYAN)停止所有服务...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ 服务已停止$(NC)"

restart: ## 重启所有服务
	@echo "$(CYAN)重启所有服务...$(NC)"
	docker-compose restart
	@echo "$(GREEN)✓ 服务已重启$(NC)"

logs: ## 查看所有服务日志
	docker-compose logs -f

logs-app: ## 查看应用日志
	docker-compose logs -f app

logs-db: ## 查看数据库日志
	docker-compose logs -f postgres

logs-search: ## 查看 Meilisearch 日志
	docker-compose logs -f meilisearch

ps: ## 查看服务状态
	docker-compose ps

health: ## 检查应用健康状态
	@echo "$(CYAN)检查应用健康状态...$(NC)"
	@curl -s http://localhost:3000/api/health | jq '.' || echo "应用未响应"

db-shell: ## 进入 PostgreSQL Shell
	@echo "$(CYAN)进入数据库...$(NC)"
	docker-compose exec postgres psql -U postgres -d archive_management

db-migrate: ## 运行数据库迁移
	@echo "$(CYAN)运行数据库迁移...$(NC)"
	docker-compose exec app npx prisma migrate deploy
	@echo "$(GREEN)✓ 迁移完成$(NC)"

db-generate: ## 生成 Prisma Client
	@echo "$(CYAN)生成 Prisma Client...$(NC)"
	docker-compose exec app npx prisma generate
	@echo "$(GREEN)✓ Client 生成完成$(NC)"

db-backup: ## 备份数据库
	@echo "$(CYAN)备份数据库...$(NC)"
	@mkdir -p backups
	docker-compose exec postgres pg_dump -U postgres archive_management > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✓ 备份完成: backups/backup_$$(date +%Y%m%d_%H%M%S).sql$(NC)"

db-restore: ## 恢复数据库（使用 FILE=backups/backup_xxx.sql）
	@echo "$(CYAN)恢复数据库...$(NC)"
	@if [ -z "$(FILE)" ]; then echo "$(YELLOW)请指定备份文件: make db-restore FILE=backups/backup_xxx.sql$(NC)"; exit 1; fi
	docker-compose exec -T postgres psql -U postgres archive_management < $(FILE)
	@echo "$(GREEN)✓ 恢复完成$(NC)"

seed: ## 初始化种子数据
	@echo "$(CYAN)初始化种子数据...$(NC)"
	docker-compose exec app npx prisma db seed
	@echo "$(GREEN)✓ 种子数据初始化完成$(NC)"

clean: ## 清理容器和卷（危险！）
	@echo "$(CYAN)清理所有容器和卷...$(NC)"
	@read -p "$(YELLOW)确认删除所有数据？[y/N] " -n 1 -r; \
	echo; \
	if [ "$$REPLY" = "y" ]; then \
		docker-compose down -v; \
		echo "$(GREEN)✓ 清理完成$(NC)"; \
	else \
		echo "$(YELLOW)已取消$(NC)"; \
	fi

clean-cache: ## 清理 Next.js 缓存
	@echo "$(CYAN)清理缓存...$(NC)"
	docker-compose exec app rm -rf .next
	@echo "$(GREEN)✓ 缓存清理完成$(NC)"

rebuild: ## 重新构建并启动
	@echo "$(CYAN)重新构建并启动...$(NC)"
	docker-compose up -d --build
	@echo "$(GREEN)✓ 重新构建完成$(NC)"

stats: ## 查看资源使用情况
	docker stats

update: ## 更新并重启应用
	@echo "$(CYAN)更新应用...$(NC)"
	git pull
	docker-compose build app
	docker-compose up -d app
	@echo "$(GREEN)✓ 更新完成$(NC)"

install: ## 安装依赖（开发用）
	@echo "$(CYAN)安装依赖...$(NC)"
	npm install
	@echo "$(GREEN)✓ 依赖安装完成$(NC)"

dev-deps: ## 安装开发依赖
	@echo "$(CYAN)安装开发依赖...$(NC)"
	npm install
	npm install -D @types/node @types/react @types/react-dom
	@echo "$(GREEN)✓ 开发依赖安装完成$(NC)"

# 检查环境
check: ## 检查环境配置
	@echo "$(CYAN)检查环境配置...$(NC)"
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)未找到 .env 文件$(NC)"; \
		echo "运行 'make init' 初始化环境"; \
		exit 1; \
	fi
	@echo "$(GREEN)✓ .env 文件存在$(NC)"
	@# 检查数据目录是否存在（可选）
	@eval PDF_STORAGE_PATH=$$(grep "^PDF_STORAGE_PATH=" .env 2>/dev/null || echo "./data/pdfs")
	@if [ ! -d "$(PDF_STORAGE_PATH)" ]; then \
		echo "$(YELLOW)PDF 存储目录不存在，将在启动时创建$(NC)"; \
	fi
	@echo "$(GREEN)✓ 环境检查通过$(NC)"
