#!/usr/bin/env bash
# =============================================================================
# 档案管理系统 —— 开发环境一键启动脚本
#
# 做的事：
#   1. 检查前置条件（docker / curl / node / .env）
#   2. 启动并等待依赖组件：PostgreSQL、Meilisearch
#   3. 检查 Prisma Client、数据库结构是否与 schema 一致、PDF 存储目录
#   4. 如果 App（next dev）已在运行 —— 先停掉再重启
#   5. 后台启动 next dev，并轮询 /api/health 直到健康
#
# 用法：
#   bash scripts/dev-start.sh                 # 检查依赖 + 重启 App + 健康检查
#   bash scripts/dev-start.sh --stop          # 只停 App
#   bash scripts/dev-start.sh --no-deps       # 不启动/不等待 docker 中间件（仅校验）
#   bash scripts/dev-start.sh --skip-drift    # 跳过 prisma 结构一致性检查（更快）
#   bash scripts/dev-start.sh --timeout 240   # 自定义健康检查超时（秒，默认 150）
#   bash scripts/dev-start.sh --help
#
# 可覆盖的环境变量：APP_PORT / HEALTH_TIMEOUT / LOG_FILE
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR" || exit 1

PID_FILE="$PROJECT_DIR/.dev-server.pid"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="${LOG_FILE:-$LOG_DIR/dev-server.log}"

APP_PORT="${APP_PORT:-3000}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-150}"
START_DEPS=1
CHECK_DRIFT=1
MODE="start"
COMPOSE="docker compose"

# ---------------------------- 输出辅助 --------------------------------------
if [ -t 1 ]; then
  C_INFO=$'\033[36m'; C_OK=$'\033[32m'; C_WARN=$'\033[33m'; C_ERR=$'\033[31m'; C_DIM=$'\033[2m'; C_RST=$'\033[0m'
else
  C_INFO=""; C_OK=""; C_WARN=""; C_ERR=""; C_DIM=""; C_RST=""
fi
info() { printf '%s[信息]%s %s\n' "$C_INFO" "$C_RST" "$*"; }
ok()   { printf '%s[ OK ]%s %s\n' "$C_OK"   "$C_RST" "$*"; }
warn() { printf '%s[警告]%s %s\n' "$C_WARN" "$C_RST" "$*" >&2; }
err()  { printf '%s[错误]%s %s\n' "$C_ERR"  "$C_RST" "$*" >&2; }
die()  { err "$*"; exit 1; }
step() { printf '\n%s==> %s%s\n' "$C_INFO" "$*" "$C_RST"; }
dim()  { printf '%s%s%s\n' "$C_DIM" "$*" "$C_RST"; }

usage() {
  sed -n '2,25p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
  exit 0
}

# ---------------------------- 参数解析 --------------------------------------
while [ $# -gt 0 ]; do
  case "$1" in
    --stop)        MODE="stop" ;;
    --no-deps)     START_DEPS=0 ;;
    --skip-drift)  CHECK_DRIFT=0 ;;
    --timeout)     shift; [ $# -gt 0 ] || die "--timeout 需要一个秒数"; HEALTH_TIMEOUT="$1" ;;
    -h|--help)     usage ;;
    *)             die "未知参数: $1（--help 查看用法）" ;;
  esac
  shift
done

# ---------------------------- 基础工具 --------------------------------------
# 读取 .env（只做 shell 变量赋值；不要把 NODE_ENV=production 带进开发进程）
load_env() {
  if [ ! -f "$PROJECT_DIR/.env" ]; then
    warn "未找到 .env，将使用默认端口/默认连接串"
    return 0
  fi
  # shellcheck disable=SC1091
  . "$PROJECT_DIR/.env"
  # .env 里通常写 NODE_ENV=production（供 docker 部署用），开发必须用 development
  unset NODE_ENV
  APP_PORT="${APP_PORT:-3000}"
  [ -n "${DATABASE_URL:-}" ] || warn ".env 中缺少 DATABASE_URL"
}

detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE="docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE="docker-compose"
  else
    die "未找到 docker compose / docker-compose"
  fi
}

# 监听指定端口的 PID（取第一个）
port_pid() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | head -n1
  elif command -v ss >/dev/null 2>&1; then
    ss -ltnp 2>/dev/null | grep -E "[:.]$port\b" | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | head -n1
  fi
}

# 进程工作目录
proc_cwd() {
  lsof -a -p "$1" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -n1
}

# 收集属于本项目的 App 进程（pid 文件 / 占用端口 / 本项目目录下的 next dev）
# 判断 pid 是否属于本项目（工作目录匹配）
is_project_pid() {
  [ "$(proc_cwd "$1")" = "$PROJECT_DIR" ]
}

# 占用 App 端口、但不属于本项目的进程（不能杀，应报错）
foreign_port_owner() {
  local pid
  pid="$(port_pid "$APP_PORT")"
  [ -n "$pid" ] || return 0
  is_project_pid "$pid" && return 0
  printf '%s' "$pid"
}

# 收集属于本项目的 App 进程（pid 文件 / 本项目目录下的 next dev / 本项目占用的端口）
collect_app_pids() {
  local pids=() pid cwd
  if [ -f "$PID_FILE" ]; then
    pid="$(tr -dc '0-9' <"$PID_FILE")"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then pids+=("$pid"); fi
  fi
  pid="$(port_pid "$APP_PORT")"
  if [ -n "$pid" ] && is_project_pid "$pid"; then pids+=("$pid"); fi
  if command -v pgrep >/dev/null 2>&1; then
    while IFS= read -r pid; do
      [ -n "$pid" ] || continue
      cwd="$(proc_cwd "$pid")"
      if [ "$cwd" = "$PROJECT_DIR" ]; then pids+=("$pid"); fi
    done < <(pgrep -f 'next dev|next-server' 2>/dev/null || true)
  fi
  if [ ${#pids[@]} -eq 0 ]; then return 0; fi
  printf '%s\n' "${pids[@]}" | sort -u | sed '/^$/d'
}

# 启动前确认端口没被别的程序占着
assert_port_available() {
  local pid cmd
  pid="$(foreign_port_owner)"
  [ -n "$pid" ] || return 0
  cmd="$(ps -o command= -p "$pid" 2>/dev/null | cut -c1-120)"
  err "端口 ${APP_PORT} 被其他程序占用（PID ${pid}: ${cmd}）"
  err "它不是本项目的进程，脚本不会去杀它。请先手动释放端口，或改用其他端口:"
  echo "     lsof -nP -iTCP:${APP_PORT} -sTCP:LISTEN"
  echo "     APP_PORT=3001 bash scripts/dev-start.sh"
  exit 1
}

json_pretty() {
  if command -v jq >/dev/null 2>&1; then jq . 2>/dev/null
  elif command -v python3 >/dev/null 2>&1; then python3 -m json.tool 2>/dev/null
  else cat
  fi
}

# ============================================================================
# 阶段 1：前置检查
# ============================================================================
preflight() {
  step "阶段 1/5 · 前置检查"

  command -v node >/dev/null 2>&1 || die "未找到 node，请安装 Node.js"
  command -v npx  >/dev/null 2>&1 || die "未找到 npx"
  command -v curl >/dev/null 2>&1 || die "未找到 curl"
  ok "本机工具链: node $(node -v), npm $(npm -v)"

  [ -f "$PROJECT_DIR/package.json" ] || die "看起来不是项目根目录: $PROJECT_DIR"

  load_env
  ok ".env 已加载（APP_PORT=${APP_PORT}）"

  if docker info >/dev/null 2>&1; then
    ok "Docker 守护进程可用"
  else
    die "Docker 未运行，请先启动 Docker Desktop"
  fi

  detect_compose
  ok "Compose 命令: $COMPOSE"

  [ -d "$PROJECT_DIR/node_modules" ] || die "缺少 node_modules，请先执行 npm install"
  ok "node_modules 已安装"

  assert_port_available
}

# ============================================================================
# 阶段 2：依赖中间件（PostgreSQL + Meilisearch）
# ============================================================================
ensure_deps() {
  step "阶段 2/5 · 依赖组件与服务"

  local pg_port="${POSTGRES_PORT:-5432}"
  local meili_port="${MEILISEARCH_PORT:-7700}"
  local pg_user="${POSTGRES_USER:-postgres}"
  local pg_db="${POSTGRES_DB:-archive_management}"

  if [ "$START_DEPS" -eq 1 ]; then
    info "启动/复用容器: postgres, meilisearch ..."
    # up -d 是幂等的：已运行则不动，已退出则拉起，配置变了才重建（数据在宿主机 bind mount 上，不会丢）
    if ! $COMPOSE up -d postgres meilisearch; then
      err "容器启动失败。常见原因：网络子网冲突（archive-network 与其他 docker 网络网段重叠）"
      err "排查: docker network ls  +  docker network inspect <name> | grep Subnet"
      exit 1
    fi
    ok "容器已就位"
  else
    info "--no-deps：跳过容器启动，仅校验连通性"
  fi

  # --- PostgreSQL ---
  local deadline=$(( SECONDS + 90 ))
  local up=0
  while [ $SECONDS -lt $deadline ]; do
    if $COMPOSE exec -T postgres pg_isready -U "$pg_user" -d "$pg_db" >/dev/null 2>&1; then
      up=1; break
    fi
    sleep 2
  done
  if [ "$up" -ne 1 ]; then
    err "PostgreSQL 未就绪（127.0.0.1:\）"
    $COMPOSE logs --tail=20 postgres 2>/dev/null | sed 's/^/    /'
    exit 1
  fi
  ok "PostgreSQL 就绪 (127.0.0.1:$pg_port, user=$pg_user, db=$pg_db)"

  # --- Meilisearch ---
  deadline=$(( SECONDS + 60 ))
  up=0
  local meili_body=""
  while [ $SECONDS -lt $deadline ]; do
    meili_body="$(curl -fsS --max-time 3 "http://127.0.0.1:$meili_port/health" 2>/dev/null || true)"
    if printf '%s' "$meili_body" | grep -q '"status":"available"'; then
      up=1; break
    fi
    sleep 1
  done
  if [ "$up" -ne 1 ]; then
    err "Meilisearch 未就绪（http://127.0.0.1:$meili_port/health 返回: ${meili_body:-空}）"
    $COMPOSE logs --tail=20 meilisearch 2>/dev/null | sed 's/^/    /'
    exit 1
  fi
  ok "Meilisearch 就绪 (http://127.0.0.1:$meili_port)"

  # --- Meilisearch 鉴权（App 侧用的是 MEILI_MASTER_KEY）---
  if [ -n "${MEILI_MASTER_KEY:-}" ]; then
    local code
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 \
      -H "Authorization: Bearer $MEILI_MASTER_KEY" \
      "http://127.0.0.1:$meili_port/indexes" 2>/dev/null || echo 000)"
    case "$code" in
      200) ok "Meilisearch API Key 有效" ;;
      401|403) warn "Meilisearch 拒绝 MEILI_MASTER_KEY（HTTP ${code}），App 的搜索功能会失败" ;;
      *) warn "Meilisearch /indexes 探测异常（HTTP ${code}），可忽略" ;;
    esac
  else
    warn ".env 未设置 MEILI_MASTER_KEY，搜索功能可能不可用"
  fi
}

# ============================================================================
# 阶段 3：应用侧依赖（Prisma / 目录）
# ============================================================================
ensure_app_deps() {
  step "阶段 3/5 · 应用侧依赖"

  if [ ! -f "$PROJECT_DIR/node_modules/.prisma/client/index.js" ]; then
    info "Prisma Client 缺失，正在生成 ..."
    npx prisma generate >/dev/null 2>&1 || die "prisma generate 失败"
  fi
  ok "Prisma Client 已生成"

  if [ "$CHECK_DRIFT" -eq 1 ]; then
    local diff
    diff="$(npx prisma migrate diff \
      --from-schema-datasource prisma/schema.prisma \
      --to-schema-datamodel prisma/schema.prisma \
      --script 2>/dev/null || true)"
    if printf '%s' "$diff" | grep -q 'empty migration'; then
      ok "数据库结构与 prisma/schema.prisma 一致"
    elif [ -z "$diff" ]; then
      warn "无法完成结构对比（数据库连不上？），已跳过"
    else
      warn "数据库结构与 schema 存在差异，建议检查后执行:"
      printf '%s\n' "$diff" | sed 's/^/    /' | head -20
    fi
  else
      dim "--skip-drift：跳过数据库结构对比"
  fi

  local pdf_dir="${PDF_STORAGE_PATH:-$PROJECT_DIR/data/pdfs}"
  if [ ! -d "$pdf_dir" ]; then
    if mkdir -p "$pdf_dir" 2>/dev/null; then
      ok "已创建 PDF 存储目录: $pdf_dir"
    else
      warn "无法创建 PDF 存储目录: $pdf_dir"
    fi
  else
    ok "PDF 存储目录存在: $pdf_dir"
  fi
}

# ============================================================================
# 阶段 4：停掉旧的 App（如果在运行）并启动新的
# ============================================================================
stop_app() {
  local pids pid
  pids="$(collect_app_pids)"

  if [ -z "$pids" ]; then
    dim "没有正在运行的 App 进程"
    rm -f "$PID_FILE"
    return 0
  fi

  info "发现 App 进程: $(echo "$pids" | tr '\n' ' ')"
  for pid in $pids; do
    if kill -0 "$pid" 2>/dev/null; then
      kill -TERM "$pid" 2>/dev/null || true
    fi
  done

  local deadline=$(( SECONDS + 15 ))
  while [ $SECONDS -lt $deadline ]; do
    local alive=0
    for pid in $pids; do kill -0 "$pid" 2>/dev/null && alive=1; done
    [ "$alive" -eq 0 ] && break
    sleep 0.5
  done

  # 优雅退出失败则强杀
  for pid in $pids; do
    if kill -0 "$pid" 2>/dev/null; then
      warn "进程 $pid 未响应 TERM，强制结束"
      kill -9 "$pid" 2>/dev/null || true
    fi
  done

  # 兜底：端口仍被本项目进程占用就再杀一次
  pid="$(port_pid "$APP_PORT")"
  if [ -n "$pid" ] && is_project_pid "$pid"; then
    warn "端口 ${APP_PORT} 仍被 PID ${pid} 占用，强制结束"
    kill -9 "$pid" 2>/dev/null || true
    sleep 1
  fi

  rm -f "$PID_FILE"

  if [ -n "$(port_pid "$APP_PORT")" ]; then
    die "端口 ${APP_PORT} 无法释放，请手动处理: lsof -nP -iTCP:${APP_PORT} -sTCP:LISTEN"
  fi
  ok "旧 App 已停止，端口 ${APP_PORT} 已释放"
}

start_app() {
  step "阶段 4/5 · 启动 App (next dev)"

  mkdir -p "$LOG_DIR"
  if [ -f "$LOG_FILE" ]; then
    mv -f "$LOG_FILE" "$LOG_FILE.prev" 2>/dev/null || true
  fi

  info "端口 ${APP_PORT}，日志: ${LOG_FILE}"
  # NODE_ENV=development 显式覆盖 .env 里的 production
  # setsid/nohup：脱离当前终端，脚本退出后 App 继续运行
  NODE_ENV=development nohup ./node_modules/.bin/next dev -p "$APP_PORT" \
    >"$LOG_FILE" 2>&1 &
  local pid=$!
  echo "$pid" >"$PID_FILE"
  dim "已拉起进程 PID ${pid}（等待编译与就绪 ...）"
}

# ============================================================================
# 阶段 5：健康检查
# ============================================================================
wait_healthy() {
  step "阶段 5/5 · 健康检查"

  local deadline=$(( SECONDS + HEALTH_TIMEOUT ))
  local body="" pid=""
  HEALTH_BODY=""
  printf '%s' "  轮询 http://127.0.0.1:$APP_PORT/api/health "

  while [ $SECONDS -lt $deadline ]; do
    body="$(curl -fsS --max-time 5 "http://127.0.0.1:$APP_PORT/api/health" 2>/dev/null || true)"
    if printf '%s' "$body" | grep -q '"status"[[:space:]]*:[[:space:]]*"healthy"'; then
      printf '\n'
      HEALTH_BODY="$body"
      return 0
    fi

    # App 进程没了 → 提前失败，不要傻等
    pid="$(tr -dc '0-9' <"$PID_FILE" 2>/dev/null)"
    if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null && [ -z "$(port_pid "$APP_PORT")" ]; then
      printf '\n'
      return 3
    fi

    printf '.'
    sleep 2
  done
  printf '\n'
  return 1
}

report_failure() {
  err "App 健康检查未通过（${1}，等待上限 ${HEALTH_TIMEOUT}s）"
  echo
  echo "---- $LOG_FILE (最后 40 行) ----"
  tail -n 40 "$LOG_FILE" 2>/dev/null | sed 's/^/    /'
  echo "--------------------------------"
  echo
  err "进程已保留在后台（PID $(cat "$PID_FILE" 2>/dev/null)），排查后可:"
  echo "     tail -f $LOG_FILE"
  echo "     bash scripts/dev-start.sh --stop"
  exit 1
}

summary() {
  step "完成"
  ok "App 已启动并通过健康检查"
  echo
  printf '  应用地址 : %shttp://localhost:%s%s\n' "$C_OK" "$APP_PORT" "$C_RST"
  printf '%s' "$HEALTH_BODY" | json_pretty | sed 's/^/  /'
  echo
  printf '  PID 文件 : %s\n' "$PID_FILE"
  printf '  日志文件 : %s\n' "$LOG_FILE"
  printf '  查看日志 : tail -f %s\n' "$LOG_FILE"
  printf '  重启     : bash scripts/dev-start.sh\n'
  printf '  停止     : bash scripts/dev-start.sh --stop\n'
}

# ============================================================================
# 主流程
# ============================================================================
if [ "$MODE" = "stop" ]; then
  step "停止开发环境 App"
  rm -f "$PID_FILE"
  if [ -z "$(collect_app_pids)" ]; then
    ok "App 未在运行"
  else
    stop_app
  fi
  dim "（docker 中间件仍在运行，如需停止: ${COMPOSE} stop postgres meilisearch）"
  exit 0
fi

preflight
ensure_deps
ensure_app_deps
stop_app
start_app

wait_healthy
case $? in
  0) summary ;;
  3) report_failure "进程已提前退出" ;;
  *) report_failure "超时" ;;
esac
