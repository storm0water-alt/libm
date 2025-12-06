import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/types'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Login/index.vue'),
      meta: {
        title: '登录',
        requiresAuth: false
      }
    },
    {
      path: '/',
      component: () => import('@/components/layout/Layout.vue'),
      meta: {
        requiresAuth: true
      },
      children: [
        {
          path: '',
          redirect: '/search'
        },
        {
          path: 'search',
          name: 'search',
          component: () => import('@/views/Search/index.vue'),
          meta: {
            title: '档案搜索',
            icon: 'Search'
          }
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/Dashboard/index.vue'),
          meta: {
            title: '工作台',
            icon: 'House'
          }
        },
        {
          path: 'archive',
          name: 'archive',
          component: () => import('@/views/Archive/index.vue'),
          meta: {
            title: '档案管理',
            icon: 'Document'
          }
        },
        {
          path: 'import',
          name: 'import',
          component: () => import('@/views/Import/index.vue'),
          meta: {
            title: '入库管理',
            icon: 'Upload'
          }
        },
        {
          path: 'logs',
          name: 'logs',
          component: () => import('@/views/Logs/index.vue'),
          meta: {
            title: '操作日志',
            icon: 'List'
          }
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/Users/index.vue'),
          meta: {
            title: '用户管理',
            icon: 'User',
            requiresAdmin: true
          }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'notFound',
      component: () => import('@/views/NotFound.vue'),
      meta: {
        title: '页面不存在'
      }
    }
  ]
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - 档案管理系统` : '档案管理系统'

  // 检查是否需要认证
  if (to.meta.requiresAuth !== false) {
    if (!authStore.isAuthenticated) {
      // 未登录，跳转到登录页
      next({
        name: 'login',
        query: { redirect: to.fullPath }
      })
      return
    }

    // 检查是否需要管理员权限
    if (to.meta.requiresAdmin && authStore.user?.role !== 'admin') {
      // 权限不足，跳转到搜索页
      next({ name: 'search' })
      return
    }
  }

  // 已登录用户访问登录页，跳转到搜索页
  if (to.name === 'login' && authStore.isAuthenticated) {
    next({ name: 'search' })
    return
  }

  next()
})

export default router
