<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import StatCard from '@/components/common/StatCard.vue'
import type { StatData } from '@/types'
import { mockData, formatDate } from '@/utils'

const router = useRouter()
const authStore = useAuthStore()

// 状态管理
const loading = ref(false)
const recentArchives = ref<any[]>([])
const recentLogs = ref<any[]>([])
const chartData = ref({
  typeDistribution: [] as any[],
  operationTrend: [] as any[]
})

// 统计数据
const statsData = computed<StatData[]>(() => [
  {
    title: '档案总数',
    value: '1,234',
    icon: 'Document',
    color: 'primary',
    trend: 12.5
  },
  {
    title: '待入库数量',
    value: '56',
    icon: 'Upload',
    color: 'warning',
    trend: -5.2
  },
  {
    title: '今日操作次数',
    value: '89',
    icon: 'Operation',
    color: 'success',
    trend: 8.7
  },
  {
    title: '存储空间使用',
    value: '45.2GB',
    icon: 'Coin',
    color: 'info',
    trend: 15.3
  }
])

// 快捷操作
const quickActions = [
  {
    title: '新增档案',
    icon: 'Plus',
    color: 'primary',
    path: '/archive'
  },
  {
    title: '文件入库',
    icon: 'Upload',
    color: 'success',
    path: '/import'
  },
  {
    title: '档案查询',
    icon: 'Search',
    color: 'warning',
    path: '/archive'
  },
  {
    title: '操作日志',
    icon: 'List',
    color: 'info',
    path: '/logs'
  }
]

// 处理统计卡片点击
const handleStatCardClick = (data: StatData) => {
  console.log('统计卡片点击:', data.title)
  // 根据不同的统计类型跳转到相应页面
  switch (data.title) {
    case '档案总数':
    case '待入库数量':
      router.push('/archive')
      break
    case '今日操作次数':
      router.push('/logs')
      break
    case '存储空间使用':
      // 打开存储详情
      break
  }
}

// 处理快捷操作点击
const handleQuickAction = (action: any) => {
  router.push(action.path)
}

// 加载最近档案
const loadRecentArchives = () => {
  // 模拟API调用
  const archives = mockData.generateArchives(5)
  recentArchives.value = archives.map(archive => ({
    ...archive,
    createdAt: formatDate(archive.createdAt, 'MM-DD HH:mm')
  }))
}

// 加载最近日志
const loadRecentLogs = () => {
  // 模拟API调用
  const logs = mockData.generateLogs(8)
  recentLogs.value = logs.map(log => ({
    ...log,
    createdAt: formatDate(log.createdAt, 'MM-DD HH:mm')
  }))
}

// 加载图表数据
const loadChartData = () => {
  // 模拟档案类型分布数据
  chartData.value.typeDistribution = [
    { name: 'PDF文档', value: 45, color: '#3b82f6' },
    { name: 'Word文档', value: 25, color: '#10b981' },
    { name: 'Excel表格', value: 15, color: '#f59e0b' },
    { name: 'PPT演示', value: 10, color: '#8b5cf6' },
    { name: '其他文件', value: 5, color: '#6b7280' }
  ]

  // 模拟操作趋势数据
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  chartData.value.operationTrend = days.map(day => ({
    day,
    operations: Math.floor(Math.random() * 100) + 50
  }))
}

// 刷新数据
const refreshData = async () => {
  loading.value = true
  try {
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 1000))

    loadRecentArchives()
    loadRecentLogs()
    loadChartData()
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 页面初始化
onMounted(() => {
  refreshData()
})
</script>

<template>
  <div class="dashboard">
    <!-- 欢迎信息 -->
    <div class="welcome-section">
      <el-card class="welcome-card">
        <div class="welcome-content">
          <div class="welcome-info">
            <h2 class="welcome-title">
              欢迎回来，{{ authStore.userInfo?.username }}！
            </h2>
            <p class="welcome-subtitle">
              今天是 {{ formatDate(new Date(), 'YYYY年MM月DD日') }}，祝您工作愉快！
            </p>
          </div>
          <div class="welcome-actions">
            <el-button type="primary" @click="handleQuickAction({ path: '/archive' })">
              <el-icon><Plus /></el-icon>
              新增档案
            </el-button>
            <el-button type="success" @click="handleQuickAction({ path: '/import' })">
              <el-icon><Upload /></el-icon>
              文件入库
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-section">
      <div class="stats-grid">
        <StatCard
          v-for="stat in statsData"
          :key="stat.title"
          :data="stat"
          :loading="loading"
          @click="handleStatCardClick"
        />
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <div class="content-left">
        <!-- 快捷操作 -->
        <el-card class="quick-actions-card">
          <template #header>
            <div class="card-header">
              <h3>快捷操作</h3>
              <el-button text type="primary">更多</el-button>
            </div>
          </template>
          <div class="quick-actions-grid">
            <div
              v-for="action in quickActions"
              :key="action.title"
              class="quick-action-item"
              :class="`quick-action-${action.color}`"
              @click="handleQuickAction(action)"
            >
              <el-icon :size="24">
                <component :is="action.icon" />
              </el-icon>
              <span>{{ action.title }}</span>
            </div>
          </div>
        </el-card>

        <!-- 最近档案 -->
        <el-card class="recent-archives-card">
          <template #header>
            <div class="card-header">
              <h3>最近档案</h3>
              <el-button text type="primary" @click="router.push('/archive')">
                查看全部
              </el-button>
            </div>
          </template>
          <div class="recent-list">
            <div
              v-for="archive in recentArchives"
              :key="archive.id"
              class="recent-item"
            >
              <div class="item-info">
                <div class="item-title">{{ archive.fileName }}</div>
                <div class="item-meta">
                  <span class="item-id">{{ archive.archiveId }}</span>
                  <span class="item-time">{{ archive.createdAt }}</span>
                </div>
              </div>
              <el-icon class="item-icon">
                <Document />
              </el-icon>
            </div>
          </div>
        </el-card>
      </div>

      <div class="content-right">
        <!-- 档案类型分布 -->
        <el-card class="chart-card">
          <template #header>
            <h3>档案类型分布</h3>
          </template>
          <div class="chart-container">
            <div class="type-distribution">
              <div
                v-for="item in chartData.typeDistribution"
                :key="item.name"
                class="type-item"
              >
                <div class="type-color" :style="{ backgroundColor: item.color }"></div>
                <span class="type-name">{{ item.name }}</span>
                <span class="type-value">{{ item.value }}%</span>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 最近操作 -->
        <el-card class="recent-logs-card">
          <template #header>
            <div class="card-header">
              <h3>最近操作</h3>
              <el-button text type="primary" @click="router.push('/logs')">
                查看全部
              </el-button>
            </div>
          </template>
          <div class="recent-list">
            <div
              v-for="log in recentLogs"
              :key="log.id"
              class="recent-item"
            >
              <div class="item-info">
                <div class="item-title">{{ log.operatorName }} {{ log.description }}</div>
                <div class="item-meta">
                  <span class="item-target">{{ log.targetName }}</span>
                  <span class="item-time">{{ log.createdAt }}</span>
                </div>
              </div>
              <el-icon class="item-icon">
                <Operation />
              </el-icon>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 操作趋势 -->
    <el-card class="trend-card">
      <template #header>
        <h3>本周操作趋势</h3>
      </template>
      <div class="trend-chart">
        <div class="trend-bars">
          <div
            v-for="item in chartData.operationTrend"
            :key="item.day"
            class="trend-bar"
          >
            <div class="bar-wrapper">
              <div
                class="bar"
                :style="{ height: `${(item.operations / 150) * 100}%` }"
              ></div>
            </div>
            <span class="bar-label">{{ item.day }}</span>
            <span class="bar-value">{{ item.operations }}</span>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 0;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.welcome-section {
  margin-bottom: 24px;
}

.welcome-card {
  border-radius: var(--border-radius-xl);
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  color: white;
  border: none;
}

.welcome-card :deep(.el-card__body) {
  padding: 32px;
}

.welcome-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.welcome-title {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  margin: 0 0 8px 0;
}

.welcome-subtitle {
  font-size: var(--font-size-base);
  margin: 0;
  opacity: 0.9;
}

.welcome-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.welcome-actions .el-button {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
}

.welcome-actions .el-button:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}

.stats-section {
  margin-bottom: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.quick-action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  border-radius: var(--border-radius-lg);
  cursor: pointer;
  transition: all 0.2s ease;
  color: white;
  font-weight: var(--font-weight-medium);
}

.quick-action-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.quick-action-primary {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
}

.quick-action-success {
  background: linear-gradient(135deg, var(--success-color), #34d399);
}

.quick-action-warning {
  background: linear-gradient(135deg, var(--warning-color), #fbbf24);
}

.quick-action-info {
  background: linear-gradient(135deg, var(--info-color), #22d3ee);
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: var(--el-fill-color-extra-light);
  border-radius: var(--border-radius-base);
  transition: all 0.2s ease;
}

.recent-item:hover {
  background: var(--el-fill-color-light);
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.item-id {
  background: var(--el-fill-color-light);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
}

.item-icon {
  color: var(--text-disabled);
  font-size: 16px;
}

.chart-container {
  padding: 16px 0;
}

.type-distribution {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.type-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.type-color {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}

.type-name {
  flex: 1;
  font-size: var(--font-size-sm);
  color: var(--text-primary);
}

.type-value {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.trend-card {
  margin-top: 24px;
}

.trend-chart {
  padding: 16px 0;
}

.trend-bars {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  height: 200px;
}

.trend-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.bar-wrapper {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: end;
  justify-content: center;
  margin-bottom: 8px;
}

.bar {
  width: 32px;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  border-radius: 4px 4px 0 0;
  min-height: 8px;
  transition: all 0.2s ease;
}

.trend-bar:hover .bar {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
}

.bar-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.bar-value {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

/* 响应式适配 */
@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

@media (max-width: 768px) {
  .welcome-content {
    flex-direction: column;
    text-align: center;
  }

  .welcome-actions {
    width: 100%;
    justify-content: center;
  }

  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }

  .quick-actions-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .trend-bars {
    gap: 8px;
    height: 150px;
  }

  .bar {
    width: 24px;
  }
}

@media (max-width: 480px) {
  .welcome-card :deep(.el-card__body) {
    padding: 20px;
  }

  .welcome-title {
    font-size: var(--font-size-2xl);
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .trend-bars {
    height: 120px;
  }

  .bar {
    width: 20px;
  }

  .bar-label,
  .bar-value {
    font-size: 10px;
  }
}

/* 暗色模式适配 */
.dark .recent-item {
  background: var(--el-fill-color-dark);
}

.dark .recent-item:hover {
  background: var(--el-fill-color);
}

.dark .type-distribution {
  background: transparent;
}

/* 紧凑模式适配 */
.compact .stats-grid {
  gap: 16px;
}

.compact .main-content {
  gap: 20px;
}

.compact .quick-actions-grid {
  gap: 8px;
}

.compact .quick-action-item {
  padding: 16px;
}
</style>