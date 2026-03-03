# Windows 部署指南

## 常见问题与解决方案

### 1. 登录失败 - 响应乱码

**症状：**
- 前端显示"用户名或密码错误"
- Network 中响应内容为乱码：`ç"¨æˆ·å`
- HTTP 状态码为 200

**原因：**
Windows 主机默认使用 GBK 编码，导致 Docker 容器内的 Node.js 进程编码不正确。

**解决方案：**

已在以下文件中添加 UTF-8 环境变量配置：

1. **Dockerfile** - 添加了：
   ```dockerfile
   ENV LANG=C.UTF-8
   ENV LC_ALL=C.UTF-8
   ```

2. **docker-compose.yml** - 添加了：
   ```yaml
   environment:
     LANG: C.UTF-8
     LC_ALL: C.UTF-8
   ```

3. **Server Actions** - 修改了登录逻辑，避免 RSC 格式响应：
   - 移除了 `redirect()` 调用
   - 改为返回 `redirectTo` 字段
   - 客户端使用 `router.push()` 进行重定向

### 2. 部署步骤

```powershell
# 1. 确保 Docker Desktop 已启动

# 2. 停止现有容器
docker-compose down

# 3. 清理旧镜像（重要！）
docker-compose build --no-cache app

# 4. 重新启动服务
docker-compose up -d

# 5. 查看日志确认启动成功
docker-compose logs -f app

# 6. 检查容器编码设置
docker exec archive-app env | grep -E "LANG|LC_ALL"
# 应该输出：
# LANG=C.UTF-8
# LC_ALL=C.UTF-8

# 7. 测试登录
# 访问 http://localhost:3000
# 使用账号：admin / admin123
```

### 3. 验证修复

登录后，Network 面板中应该看到：
- 正确的 JSON 响应（非乱码）
- 中文错误信息正常显示
- 登录成功后自动跳转到 /dashboard

### 4. 如果仍然失败

#### 检查数据库连接

```powershell
# 进入应用容器
docker exec -it archive-app sh

# 测试数据库连接
npx prisma db execute --stdin <<'EOF'
SELECT username, role, status FROM "User" LIMIT 5;
EOF

# 如果提示用户不存在，运行 seed
exit
docker-compose exec app npm run db:seed
```

#### 检查环境变量

```powershell
# 查看 .env 文件
cat .env

# 确保包含以下配置
DATABASE_URL="postgresql://admin:123456@postgres:5432/archive_management?pgbouncer=true&connect_timeout=15"
NEXTAUTH_URL="http://your-windows-host:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

#### 查看详细日志

```powershell
# 实时查看应用日志
docker-compose logs -f app

# 查看数据库日志
docker-compose logs -f postgres
```

### 5. 性能优化（可选）

如果 Windows 主机性能较差，可以调整 Node.js 内存限制：

**docker-compose.yml**
```yaml
environment:
  NODE_OPTIONS: "--max-old-space-size=2048"  # 降低内存使用
```

### 6. 常见错误代码

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `ECONNREFUSED` | 数据库未启动 | `docker-compose up -d postgres` |
| `PrismaClientInitializationError` | 数据库连接失败 | 检查 DATABASE_URL 配置 |
| 乱码响应 | 编码问题 | 重新构建镜像 `--no-cache` |
| `NEXT_REDIRECT` 错误 | Server Action 重定向问题 | 已在代码中修复 |

## 技术细节

### 为什么会出现乱码？

1. **Windows 主机编码**：Windows 默认使用 GBK/GB2312 编码
2. **Docker 继承**：Linux 容器可能继承主机的区域设置
3. **Node.js 行为**：未明确设置 UTF-8 时，Node.js 可能使用系统默认编码
4. **RSC Payload**：Next.js Server Actions 返回的 RSC 格式对编码敏感

### 为什么移除了 redirect()？

Next.js 的 `redirect()` 在 Server Action 中会：
1. 抛出一个特殊的错误（NEXT_REDIRECT）
2. 导致响应格式变为 RSC payload
3. 在某些编码环境下出现乱码

改用客户端重定向可以：
1. 返回标准 JSON 格式
2. 避免编码问题
3. 提供更好的用户体验

## 联系支持

如果以上方法都无法解决问题，请提供：
1. `docker-compose logs app` 的完整输出
2. 浏览器 Network 面板的响应截图
3. `docker exec archive-app env` 的输出
