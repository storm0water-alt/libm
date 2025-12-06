import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { storage } from '@/utils'
import type { ThemeConfig } from '@/types'

export const useAppStore = defineStore('app', () => {
  // 状态
  const sidebarCollapsed = ref(false)
  const loading = ref(false)
  const theme = ref<ThemeConfig>({
    primaryColor: '#1e3a8a',
    darkMode: false,
    compactMode: false
  })

  // 计算属性
  const isDarkMode = computed(() => theme.value.darkMode)
  const isCompactMode = computed(() => theme.value.compactMode)
  const primaryColor = computed(() => theme.value.primaryColor)

  // 初始化应用设置
  function initApp() {
    // 从本地存储恢复设置
    const savedTheme = storage.get<ThemeConfig>('theme')
    const savedSidebarCollapsed = storage.get<boolean>('sidebarCollapsed')

    if (savedTheme) {
      theme.value = savedTheme
      applyTheme(savedTheme)
    }

    if (savedSidebarCollapsed !== null) {
      sidebarCollapsed.value = savedSidebarCollapsed
    }

    // 监听系统主题变化
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', handleSystemThemeChange)
    }
  }

  // 切换侧边栏
  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
    storage.set('sidebarCollapsed', sidebarCollapsed.value)
  }

  // 设置侧边栏状态
  function setSidebarCollapsed(collapsed: boolean) {
    sidebarCollapsed.value = collapsed
    storage.set('sidebarCollapsed', collapsed)
  }

  // 切换主题
  function toggleDarkMode() {
    theme.value.darkMode = !theme.value.darkMode
    saveTheme()
    applyTheme(theme.value)
  }

  // 设置主题
  function setTheme(newTheme: Partial<ThemeConfig>) {
    theme.value = { ...theme.value, ...newTheme }
    saveTheme()
    applyTheme(theme.value)
  }

  // 切换紧凑模式
  function toggleCompactMode() {
    theme.value.compactMode = !theme.value.compactMode
    saveTheme()
    applyTheme(theme.value)
  }

  // 应用主题到DOM
  function applyTheme(themeConfig: ThemeConfig) {
    const root = document.documentElement

    // 设置CSS变量
    root.style.setProperty('--primary-color', themeConfig.primaryColor)

    // 设置暗色模式
    if (themeConfig.darkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // 设置紧凑模式
    if (themeConfig.compactMode) {
      root.classList.add('compact')
    } else {
      root.classList.remove('compact')
    }
  }

  // 保存主题到本地存储
  function saveTheme() {
    storage.set('theme', theme.value)
  }

  // 处理系统主题变化
  function handleSystemThemeChange(e: MediaQueryListEvent) {
    // 如果用户没有手动设置过主题，跟随系统
    if (!storage.get('theme')) {
      theme.value.darkMode = e.matches
      applyTheme(theme.value)
    }
  }

  // 设置加载状态
  function setLoading(loadingState: boolean) {
    loading.value = loadingState
  }

  // 显示全局加载
  function showGlobalLoading() {
    loading.value = true
  }

  // 隐藏全局加载
  function hideGlobalLoading() {
    loading.value = false
  }

  // 重置应用设置
  function resetApp() {
    sidebarCollapsed.value = false
    theme.value = {
      primaryColor: '#1e3a8a',
      darkMode: false,
      compactMode: false
    }

    storage.remove('sidebarCollapsed')
    storage.remove('theme')

    applyTheme(theme.value)
  }

  // 获取系统信息
  function getSystemInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      colorDepth: window.screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      online: navigator.onLine
    }
  }

  // 检查设备类型
  function getDeviceType() {
    const width = window.innerWidth
    if (width < 768) return 'mobile'
    if (width < 1024) return 'tablet'
    return 'desktop'
  }

  // 检查是否为移动设备
  function isMobile() {
    return getDeviceType() === 'mobile'
  }

  // 检查是否为平板设备
  function isTablet() {
    return getDeviceType() === 'tablet'
  }

  // 检查是否为桌面设备
  function isDesktop() {
    return getDeviceType() === 'desktop'
  }

  // 获取响应式断点
  function getBreakpoint() {
    const width = window.innerWidth
    if (width < 640) return 'sm'
    if (width < 768) return 'md'
    if (width < 1024) return 'lg'
    if (width < 1280) return 'xl'
    return '2xl'
  }

  return {
    // 状态
    sidebarCollapsed,
    loading,
    theme,

    // 计算属性
    isDarkMode,
    isCompactMode,
    primaryColor,

    // 方法
    initApp,
    toggleSidebar,
    setSidebarCollapsed,
    toggleDarkMode,
    setTheme,
    toggleCompactMode,
    setLoading,
    showGlobalLoading,
    hideGlobalLoading,
    resetApp,
    getSystemInfo,
    getDeviceType,
    isMobile,
    isTablet,
    isDesktop,
    getBreakpoint
  }
})