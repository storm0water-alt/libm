<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Search, Sunny, Moon, FullScreen, Bell, User, CaretBottom, Setting, SwitchButton, Fold, Expand } from '@element-plus/icons-vue'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()

// 用户信息
const userInfo = computed(() => authStore.user)

// 系统标题
const systemTitle = computed(() => '正成档案管理系统')

// 系统Logo
const systemLogo = computed(() => 'bi-archive-fill')

// 退出登录
const handleLogout = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要退出登录吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    authStore.logout()
    router.push('/login')
  } catch {
    // 用户取消
  }
}

// 跳转到个人资料
const handleProfile = () => {
  ElMessage.info('个人资料功能开发中')
}

// 跳转到系统设置
const handleSettings = () => {
  ElMessage.info('系统设置功能开发中')
}

// 跳转到全局搜索页面
const handleGlobalSearch = () => {
  router.push('/search')
}

// 处理下拉菜单命令
const handleCommand = (command: string) => {
  switch (command) {
    case 'profile':
      handleProfile()
      break
    case 'settings':
      handleSettings()
      break
    case 'logout':
      handleLogout()
      break
  }
}
</script>

<template>
  <div class="app-header">
    <div class="header-left">
      <!-- 菜单切换按钮 -->
      <el-button
        class="menu-toggle"
        text
        @click="appStore.toggleSidebar"
      >
        <el-icon :size="20">
          <Fold v-if="!appStore.sidebarCollapsed" />
          <Expand v-else />
        </el-icon>
      </el-button>

      <!-- 系统Logo和标题 -->
      <!-- <div class="system-branding hidden-mobile">
        <i :class="['bi', systemLogo, 'system-logo']"></i>
        <h1 class="system-title">{{ systemTitle }}</h1>
      </div> -->
    </div>

    <div class="header-right">
      <!-- 主题切换 -->
      <el-button
        class="header-action"
        text
        @click="appStore.toggleDarkMode"
        :title="appStore.isDarkMode ? '切换到亮色模式' : '切换到暗色模式'"
      >
        <el-icon :size="18">
          <Sunny v-if="appStore.isDarkMode" />
          <Moon v-else />
        </el-icon>
      </el-button>

      <!-- 全局搜索 -->
      <el-button
        class="header-action"
        text
        @click="handleGlobalSearch"
        title="全局搜索"
      >
        <el-icon :size="18">
          <Search />
        </el-icon>
      </el-button>

      <!-- 全屏切换 -->
      <el-button
        class="header-action"
        text
        @click="() => {
          if (document.fullscreenElement) {
            document.exitFullscreen()
          } else {
            document.documentElement.requestFullscreen()
          }
        }"
        title="全屏切换"
      >
        <el-icon :size="18">
          <FullScreen />
        </el-icon>
      </el-button>

      <!-- 通知 -->
      <el-badge :value="3" :max="99" class="header-action">
        <el-button text title="通知">
          <el-icon :size="18">
            <Bell />
          </el-icon>
        </el-button>
      </el-badge>

      <!-- 用户下拉菜单 -->
      <el-dropdown trigger="click" @command="handleCommand">
        <div class="user-info">
          <el-avatar
            :size="32"
            :src="userInfo?.avatar"
            :alt="userInfo?.username"
          >
            <el-icon><User /></el-icon>
          </el-avatar>
          <span class="username hidden-mobile">{{ userInfo?.username }}</span>
          <el-icon class="dropdown-icon">
            <CaretBottom />
          </el-icon>
        </div>

        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">
              <el-icon><User /></el-icon>
              个人资料
            </el-dropdown-item>
            <el-dropdown-item command="settings">
              <el-icon><Setting /></el-icon>
              系统设置
            </el-dropdown-item>
            <el-dropdown-item divided command="logout">
              <el-icon><SwitchButton /></el-icon>
              退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<style scoped>
.app-header {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: var(--el-bg-color-overlay);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.menu-toggle {
  padding: 8px;
  border-radius: var(--border-radius-base);
  transition: all 0.2s ease;
}

.menu-toggle:hover {
  background-color: var(--el-fill-color-light);
}

.system-branding {
  display: flex;
  align-items: center;
  gap: 12px;
}

.system-logo {
  font-size: 28px;
  color: var(--primary-color);
  flex-shrink: 0;
}

.system-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0;
  white-space: nowrap;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-action {
  padding: 8px;
  border-radius: var(--border-radius-base);
  transition: all 0.2s ease;
}

.header-action:hover {
  background-color: var(--el-fill-color-light);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--border-radius-base);
  cursor: pointer;
  transition: all 0.2s ease;
}

.user-info:hover {
  background-color: var(--el-fill-color-light);
}

.username {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  font-weight: var(--font-weight-medium);
}

.dropdown-icon {
  font-size: 12px;
  color: var(--text-secondary);
  transition: transform 0.2s ease;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .app-header {
    padding: 0 12px;
  }

  .header-right {
    gap: 4px;
  }

  .user-info {
    padding: 8px;
  }

  .system-branding {
    gap: 8px;
  }

  .system-logo {
    font-size: 24px;
  }

  .system-title {
    font-size: var(--font-size-base);
  }
}

/* 暗色模式适配 */
.dark .menu-toggle:hover,
.dark .header-action:hover,
.dark .user-info:hover {
  background-color: var(--el-fill-color-dark);
}

/* 紧凑模式适配 */
.compact .app-header {
  height: 50px;
  padding: 0 12px;
}

.compact .system-title {
  font-size: var(--font-size-base);
}
</style>