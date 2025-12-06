<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import type { LoginForm } from '@/types'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// 表单引用
const loginFormRef = ref<FormInstance>()

// 表单数据
const loginForm = reactive<LoginForm>({
  username: '',
  password: '',
  captcha: '',
  remember: false
})

// 表单验证规则
const loginRules: FormRules<LoginForm> = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
  ],
  captcha: [
    { required: false, message: '请输入验证码', trigger: 'blur' },
    { len: 4, message: '验证码长度为 4 个字符', trigger: 'blur' }
  ]
}

// 状态管理
const showPassword = ref(false)
const captchaUrl = ref('')
const loading = ref(false)

// 生成验证码
const generateCaptcha = () => {
  // 生成随机验证码图片
  const canvas = document.createElement('canvas')
  canvas.width = 120
  canvas.height = 40
  const ctx = canvas.getContext('2d')

  if (ctx) {
    // 背景色
    ctx.fillStyle = '#f0f0f0'
    ctx.fillRect(0, 0, 120, 40)

    // 生成随机文字
    const chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678'
    let captcha = ''
    for (let i = 0; i < 4; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)]
      captcha += char

      // 绘制文字
      ctx.font = `${20 + Math.random() * 10}px Arial`
      ctx.fillStyle = `#${Math.floor(Math.random() * 16777215).toString(16)}`
      ctx.fillText(char || '', 15 + i * 25, 25 + Math.random() * 10)
    }

    // 添加干扰线
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `#${Math.floor(Math.random() * 16777215).toString(16)}`
      ctx.beginPath()
      ctx.moveTo(Math.random() * 120, Math.random() * 40)
      ctx.lineTo(Math.random() * 120, Math.random() * 40)
      ctx.stroke()
    }

    captchaUrl.value = canvas.toDataURL()
  }
}

// 刷新验证码
const refreshCaptcha = () => {
  generateCaptcha()
  loginForm.captcha = ''
}

// 切换密码显示
const togglePassword = () => {
  showPassword.value = !showPassword.value
}

// 忘记密码
const handleForgotPassword = () => {
  ElMessage.info('请联系管理员重置密码')
}

// 登录处理
const handleLogin = async () => {
  if (!loginFormRef.value) return

  try {
    const valid = await loginFormRef.value.validate()
    if (!valid) return

    loading.value = true

    // 验证码检查（如果启用了验证码）
    if (loginForm.captcha) {
      // 这里应该进行验证码验证
      // 暂时跳过
    }

    const success = await authStore.login(loginForm)

    if (success) {
      // 跳转到重定向地址或搜索页
      const redirect = (route.query.redirect as string) || '/search'
      router.push(redirect)
    }
  } catch (error) {
    console.error('登录失败:', error)
    ElMessage.error('登录失败，请重试')
  } finally {
    loading.value = false
  }
}

// 快速登录（用于演示）
const quickLogin = (username: string, password: string) => {
  loginForm.username = username
  loginForm.password = password
  loginForm.remember = true
  handleLogin()
}

// 键盘事件处理
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    handleLogin()
  }
}

// 页面初始化
onMounted(() => {
  generateCaptcha()
  document.addEventListener('keydown', handleKeydown)

  // 如果已登录，直接跳转
  if (authStore.isAuthenticated) {
    router.push('/search')
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="login-container">
    <!-- 背景装饰 -->
    <div class="login-background">
      <div class="bg-shape shape-1"></div>
      <div class="bg-shape shape-2"></div>
      <div class="bg-shape shape-3"></div>
    </div>

    <!-- 登录卡片 -->
    <div class="login-card">
      <div class="login-header">
        <div class="logo-container">
          <el-icon class="logo-icon" :size="48">
            <Document />
          </el-icon>
        </div>
        <div class="system-branding">
          <i class="bi bi-archive-fill system-logo"></i>
          <h1 class="system-title">正成档案管理系统</h1>
        </div>
        <p class="system-subtitle">Zhengcheng Archive Management System</p>
      </div>

      <div class="login-content">
        <el-form
          ref="loginFormRef"
          :model="loginForm"
          :rules="loginRules"
          size="large"
          @submit.prevent="handleLogin"
        >
          <!-- 用户名 -->
          <el-form-item prop="username">
            <el-input
              v-model="loginForm.username"
              placeholder="请输入用户名"
              prefix-icon="User"
              clearable
              :disabled="loading"
            />
          </el-form-item>

          <!-- 密码 -->
          <el-form-item prop="password">
            <el-input
              v-model="loginForm.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入密码"
              prefix-icon="Lock"
              :suffix-icon="showPassword ? 'Hide' : 'View'"
              @suffix-icon-click="togglePassword"
              show-password
              clearable
              :disabled="loading"
            />
          </el-form-item>

          <!-- 验证码 -->
          <el-form-item prop="captcha">
            <div class="captcha-container">
              <el-input
                v-model="loginForm.captcha"
                placeholder="请输入验证码"
                prefix-icon="Key"
                clearable
                :disabled="loading"
                style="flex: 1"
              />
              <div class="captcha-image" @click="refreshCaptcha">
                <img v-if="captchaUrl" :src="captchaUrl" alt="验证码" />
                <el-icon v-else :size="20"><Refresh /></el-icon>
              </div>
            </div>
          </el-form-item>

          <!-- 记住密码和忘记密码 -->
          <div class="login-options">
            <el-checkbox v-model="loginForm.remember" :disabled="loading">
              记住密码
            </el-checkbox>
            <el-button type="text" @click="handleForgotPassword" :disabled="loading">
              忘记密码？
            </el-button>
          </div>

          <!-- 登录按钮 -->
          <el-form-item>
            <el-button
              type="primary"
              size="large"
              style="width: 100%"
              :loading="loading"
              @click="handleLogin"
            >
              登录
            </el-button>
          </el-form-item>
        </el-form>

        <!-- 演示账号 -->
        <div class="demo-accounts">
          <el-divider>演示账号</el-divider>
          <div class="demo-buttons">
            <el-button
              size="small"
              type="primary"
              plain
              @click="quickLogin('admin', 'admin123')"
            >
              管理员: admin/admin123
            </el-button>
            <el-button
              size="small"
              type="success"
              plain
              @click="quickLogin('user', 'user123')"
            >
              普通用户: user/user123
            </el-button>
          </div>
        </div>
      </div>

      <!-- 页脚 -->
      <div class="login-footer">
        <p>&copy; 2024 正成档案管理系统. All rights reserved.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  padding: 20px;
}

.login-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.bg-shape {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  animation: float 6s ease-in-out infinite;
}

.shape-1 {
  width: 200px;
  height: 200px;
  top: 10%;
  left: 10%;
  animation-delay: 0s;
}

.shape-2 {
  width: 150px;
  height: 150px;
  top: 60%;
  right: 10%;
  animation-delay: 2s;
}

.shape-3 {
  width: 100px;
  height: 100px;
  bottom: 20%;
  left: 20%;
  animation-delay: 4s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
}

.login-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  width: 100%;
  max-width: 420px;
  padding: 40px;
  position: relative;
  z-index: 1;
  backdrop-filter: blur(10px);
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.logo-container {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  border-radius: 20px;
  margin-bottom: 20px;
  box-shadow: 0 10px 15px -3px rgba(30, 58, 138, 0.3);
}

.logo-icon {
  color: white;
}

.system-branding {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 8px;
}

.system-logo {
  font-size: 32px;
  color: var(--primary-color);
  filter: drop-shadow(0 2px 4px rgba(30, 58, 138, 0.3));
}

.system-title {
  font-size: 28px;
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin: 0;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.system-subtitle {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
  font-weight: var(--font-weight-normal);
  letter-spacing: 1px;
}

.login-content {
  margin-bottom: 32px;
}

.captcha-container {
  display: flex;
  gap: 12px;
  align-items: center;
}

.captcha-image {
  width: 120px;
  height: 40px;
  border: 1px solid var(--el-border-color);
  border-radius: var(--border-radius-base);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: var(--el-fill-color-extra-light);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.captcha-image:hover {
  border-color: var(--primary-color);
}

.captcha-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 3px;
}

.login-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.demo-accounts {
  margin-top: 24px;
}

.demo-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.demo-buttons .el-button {
  font-size: 12px;
  padding: 6px 12px;
}

.login-footer {
  text-align: center;
  padding-top: 24px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.login-footer p {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--text-disabled);
}

/* 响应式适配 */
@media (max-width: 768px) {
  .login-container {
    height: 100vh;
    width: 100vw;
    padding: 16px;
  }

  .login-card {
    padding: 32px 24px;
  }

  .system-title {
    font-size: 24px;
  }

  .demo-buttons {
    flex-direction: column;
  }

  .demo-buttons .el-button {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .login-container {
    height: 100vh;
    width: 100vw;
    padding: 12px;
  }

  .login-card {
    padding: 24px 20px;
  }

  .logo-container {
    width: 60px;
    height: 60px;
    border-radius: 15px;
    margin-bottom: 16px;
  }

  .system-branding {
    gap: 12px;
  }

  .system-logo {
    font-size: 28px;
  }

  .system-title {
    font-size: 20px;
  }

  .captcha-container {
    flex-direction: column;
    gap: 8px;
  }

  .captcha-image {
    width: 100%;
    max-width: 200px;
    margin: 0 auto;
  }
}

/* 大屏幕适配 */
@media (min-width: 1920px) {
  .login-container {
    padding: 40px;
  }

  .login-card {
    max-width: 500px;
    width: 100%;
  }
}

@media (min-width: 2560px) {
  .login-container {
    padding: 60px;
  }

  .login-card {
    max-width: 600px;
    width: 100%;
  }
}

/* 暗色模式适配 */
.dark .login-card {
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-darker);
}

.dark .system-title {
  background: linear-gradient(135deg, var(--primary-light), #60a5fa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>