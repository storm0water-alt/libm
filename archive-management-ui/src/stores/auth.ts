import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { storage } from '@/utils'
import type { User, LoginForm } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const user = ref<User | null>(null)
  const token = ref<string>('')
  const loading = ref(false)

  // 计算属性
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const userInfo = computed(() => user.value)

  // 初始化
  function initAuth() {
    const savedToken = storage.get<string>('token')
    const savedUser = storage.get<User>('user')

    if (savedToken && savedUser) {
      token.value = savedToken
      user.value = savedUser
    }
  }

  // 登录
  async function login(loginForm: LoginForm): Promise<boolean> {
    loading.value = true

    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 模拟登录验证
      if (loginForm.username === 'admin' && loginForm.password === 'admin123') {
        const userData: User = {
          id: '1',
          username: 'admin',
          role: 'admin',
          avatar: '',
          createdAt: new Date().toISOString(),
          status: 'active'
        }

        const userToken = 'mock_token_' + Date.now()

        // 保存到状态
        user.value = userData
        token.value = userToken

        // 保存到本地存储
        storage.set('token', userToken)
        storage.set('user', userData)

        if (loginForm.remember) {
          storage.set('remember', true)
        }

        ElMessage.success('登录成功')
        return true
      } else if (loginForm.username === 'user' && loginForm.password === 'user123') {
        const userData: User = {
          id: '2',
          username: 'user',
          role: 'user',
          avatar: '',
          createdAt: new Date().toISOString(),
          status: 'active'
        }

        const userToken = 'mock_token_' + Date.now()

        user.value = userData
        token.value = userToken

        storage.set('token', userToken)
        storage.set('user', userData)

        if (loginForm.remember) {
          storage.set('remember', true)
        }

        ElMessage.success('登录成功')
        return true
      } else {
        ElMessage.error('用户名或密码错误')
        return false
      }
    } catch (error) {
      console.error('登录失败:', error)
      ElMessage.error('登录失败，请重试')
      return false
    } finally {
      loading.value = false
    }
  }

  // 登出
  function logout() {
    user.value = null
    token.value = ''
    storage.remove('token')
    storage.remove('user')
    ElMessage.success('已退出登录')
  }

  // 更新用户信息
  function updateUser(userData: Partial<User>) {
    if (user.value) {
      user.value = { ...user.value, ...userData }
      storage.set('user', user.value)
    }
  }

  // 检查认证状态
  function checkAuth(): boolean {
    const savedToken = storage.get<string>('token')
    const savedUser = storage.get<User>('user')

    if (savedToken && savedUser) {
      token.value = savedToken
      user.value = savedUser
      return true
    }

    return false
  }

  // 刷新token
  async function refreshToken(): Promise<boolean> {
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500))

      // 在实际应用中，这里会调用刷新token的API
      // 现在只是模拟成功
      return true
    } catch (error) {
      console.error('刷新token失败:', error)
      logout()
      return false
    }
  }

  // 修改密码
  async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
    loading.value = true

    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 在实际应用中，这里会调用修改密码的API
      ElMessage.success('密码修改成功')
      return true
    } catch (error) {
      console.error('修改密码失败:', error)
      ElMessage.error('密码修改失败，请重试')
      return false
    } finally {
      loading.value = false
    }
  }

  // 获取权限列表
  function getPermissions(): string[] {
    if (!user.value) return []

    const basePermissions = ['dashboard:read', 'archive:read', 'import:read', 'logs:read']

    if (user.value.role === 'admin') {
      return [
        ...basePermissions,
        'archive:create',
        'archive:update',
        'archive:delete',
        'archive:export',
        'import:create',
        'users:read',
        'users:create',
        'users:update',
        'users:delete',
        'system:manage'
      ]
    }

    return basePermissions
  }

  // 检查是否有特定权限
  function hasPermission(permission: string): boolean {
    const permissions = getPermissions()
    return permissions.includes(permission)
  }

  // 检查是否有任意权限
  function hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(permission => hasPermission(permission))
  }

  // 检查是否有所有权限
  function hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(permission => hasPermission(permission))
  }

  return {
    // 状态
    user,
    token,
    loading,

    // 计算属性
    isAuthenticated,
    isAdmin,
    userInfo,

    // 方法
    initAuth,
    login,
    logout,
    updateUser,
    checkAuth,
    refreshToken,
    changePassword,
    getPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  }
})