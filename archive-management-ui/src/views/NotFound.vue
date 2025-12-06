<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/dashboard')
}

const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="not-found">
    <div class="not-found-content">
      <div class="error-visual">
        <div class="error-number">404</div>
        <div class="error-text">页面不存在</div>
      </div>

      <div class="error-description">
        <h2>抱歉，您访问的页面不存在</h2>
        <p>可能是页面已被删除、移动或URL地址输入错误</p>
      </div>

      <div class="error-actions">
        <el-button type="primary" @click="goHome">
          <el-icon><House /></el-icon>
          返回首页
        </el-button>
        <el-button @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回上页
        </el-button>
      </div>

      <div class="help-suggestions">
        <h3>您可以尝试：</h3>
        <ul>
          <li>检查URL地址是否正确</li>
          <li>返回首页重新导航</li>
          <li>联系系统管理员</li>
        </ul>
      </div>
    </div>

    <!-- 装饰背景 -->
    <div class="decorative-elements">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="circle circle-3"></div>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--background-color) 0%, var(--el-fill-color-light) 100%);
  position: relative;
  overflow: hidden;
}

.not-found-content {
  text-align: center;
  max-width: 600px;
  padding: 0 20px;
  position: relative;
  z-index: 2;
}

.error-visual {
  margin-bottom: 40px;
}

.error-number {
  font-size: 120px;
  font-weight: var(--font-weight-bold);
  color: var(--primary-color);
  line-height: 1;
  margin-bottom: 16px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.error-text {
  font-size: var(--font-size-xl);
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
}

.error-description {
  margin-bottom: 40px;
}

.error-description h2 {
  font-size: var(--font-size-2xl);
  color: var(--text-primary);
  margin-bottom: 12px;
  font-weight: var(--font-weight-semibold);
}

.error-description p {
  font-size: var(--font-size-base);
  color: var(--text-secondary);
  line-height: 1.6;
}

.error-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 40px;
}

.help-suggestions {
  text-align: left;
  background: var(--card-background);
  padding: 24px;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-base);
  max-width: 400px;
  margin: 0 auto;
}

.help-suggestions h3 {
  font-size: var(--font-size-lg);
  color: var(--text-primary);
  margin-bottom: 16px;
  font-weight: var(--font-weight-medium);
}

.help-suggestions ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.help-suggestions li {
  padding: 8px 0;
  color: var(--text-secondary);
  position: relative;
  padding-left: 20px;
}

.help-suggestions li::before {
  content: '•';
  color: var(--primary-color);
  position: absolute;
  left: 0;
  font-weight: bold;
}

/* 装饰元素 */
.decorative-elements {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
}

.circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.1;
  background: var(--primary-color);
}

.circle-1 {
  width: 200px;
  height: 200px;
  top: 10%;
  left: 10%;
  animation: float 6s ease-in-out infinite;
}

.circle-2 {
  width: 150px;
  height: 150px;
  top: 60%;
  right: 10%;
  animation: float 8s ease-in-out infinite reverse;
}

.circle-3 {
  width: 100px;
  height: 100px;
  bottom: 20%;
  left: 20%;
  animation: float 4s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}

/* 响应式适配 */
@media (max-width: 768px) {
  .error-number {
    font-size: 80px;
  }

  .error-text {
    font-size: var(--font-size-lg);
  }

  .error-description h2 {
    font-size: var(--font-size-xl);
  }

  .error-actions {
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .error-actions .el-button {
    width: 200px;
  }

  .help-suggestions {
    padding: 20px;
  }

  .circle {
    opacity: 0.05;
  }

  .circle-1 {
    width: 120px;
    height: 120px;
  }

  .circle-2 {
    width: 100px;
    height: 100px;
  }

  .circle-3 {
    width: 80px;
    height: 80px;
  }
}

@media (max-width: 480px) {
  .not-found-content {
    padding: 0 16px;
  }

  .error-number {
    font-size: 60px;
  }

  .error-text {
    font-size: var(--font-size-base);
  }

  .error-description h2 {
    font-size: var(--font-size-lg);
  }

  .help-suggestions {
    padding: 16px;
  }
}

/* 暗色模式适配 */
.dark .not-found {
  background: linear-gradient(135deg, var(--el-bg-color-page) 0%, var(--el-fill-color-dark) 100%);
}

.dark .help-suggestions {
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-darker);
}

.dark .circle {
  background: var(--primary-light);
  opacity: 0.05;
}
</style>