<script setup lang="ts">
import { computed } from 'vue'
import type { StatData } from '@/types'

interface Props {
  data: StatData
  loading?: boolean
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  clickable: true
})

const emit = defineEmits<{
  click: [data: StatData]
}>()

// 根据颜色类型获取样式类
const cardClass = computed(() => {
  const colorClasses = {
    primary: 'stat-card--primary',
    success: 'stat-card--success',
    warning: 'stat-card--warning',
    danger: 'stat-card--danger'
  }
  return `stat-card ${colorClasses[props.data.color] || 'stat-card--primary'}`
})

// 趋势图标和颜色
const trendIcon = computed(() => {
  if (props.data.trend === undefined) return null
  return props.data.trend > 0 ? 'ArrowUp' : 'ArrowDown'
})

const trendClass = computed(() => {
  if (props.data.trend === undefined) return ''
  return props.data.trend > 0 ? 'trend-up' : 'trend-down'
})

const trendText = computed(() => {
  if (props.data.trend === undefined) return ''
  return `${Math.abs(props.data.trend)}%`
})

// 处理点击事件
const handleClick = () => {
  if (props.clickable) {
    emit('click', props.data)
  }
}
</script>

<template>
  <div
    :class="[cardClass, { 'stat-card--clickable': clickable }]"
    @click="handleClick"
  >
    <!-- 加载状态 -->
    <div v-if="loading" class="stat-card__loading">
      <el-skeleton animated>
        <template #template>
          <div class="stat-card__skeleton">
            <el-skeleton-item variant="circle" class="skeleton-icon" />
            <div class="skeleton-content">
              <el-skeleton-item variant="text" class="skeleton-title" />
              <el-skeleton-item variant="text" class="skeleton-value" />
            </div>
          </div>
        </template>
      </el-skeleton>
    </div>

    <!-- 正常内容 -->
    <div v-else class="stat-card__content">
      <!-- 图标区域 -->
      <div class="stat-card__icon">
        <el-icon :size="32">
          <component :is="data.icon" />
        </el-icon>
      </div>

      <!-- 数据区域 -->
      <div class="stat-card__info">
        <h3 class="stat-card__title">{{ data.title }}</h3>
        <div class="stat-card__value">
          <span class="value-number">{{ data.value }}</span>
        </div>

        <!-- 趋势信息 -->
        <div v-if="data.trend !== undefined" class="stat-card__trend">
          <el-icon :size="14" :class="trendClass">
            <component :is="trendIcon" />
          </el-icon>
          <span :class="trendClass">{{ trendText }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  background: var(--card-background);
  border-radius: var(--border-radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-base);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: var(--primary-color);
  transition: all 0.3s ease;
}

.stat-card--primary::before {
  background: var(--primary-color);
}

.stat-card--success::before {
  background: var(--success-color);
}

.stat-card--warning::before {
  background: var(--warning-color);
}

.stat-card--danger::before {
  background: var(--danger-color);
}

.stat-card--clickable {
  cursor: pointer;
}

.stat-card--clickable:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.stat-card__content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-card__icon {
  width: 64px;
  height: 64px;
  border-radius: var(--border-radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.stat-card--primary .stat-card__icon {
  background: rgba(30, 58, 138, 0.1);
  color: var(--primary-color);
}

.stat-card--success .stat-card__icon {
  background: rgba(16, 185, 129, 0.1);
  color: var(--success-color);
}

.stat-card--warning .stat-card__icon {
  background: rgba(245, 158, 11, 0.1);
  color: var(--warning-color);
}

.stat-card--danger .stat-card__icon {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger-color);
}

.stat-card--clickable:hover .stat-card__icon {
  transform: scale(1.1);
}

.stat-card__info {
  flex: 1;
  min-width: 0;
}

.stat-card__title {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
  margin: 0 0 8px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-card__value {
  margin-bottom: 4px;
}

.value-number {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  line-height: 1;
}

.stat-card__trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.trend-up {
  color: var(--success-color);
}

.trend-down {
  color: var(--danger-color);
}

/* 加载骨架屏样式 */
.stat-card__skeleton {
  display: flex;
  align-items: center;
  gap: 16px;
}

.skeleton-icon {
  width: 64px !important;
  height: 64px !important;
  flex-shrink: 0;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-title {
  width: 80px !important;
  height: 16px !important;
}

.skeleton-value {
  width: 120px !important;
  height: 32px !important;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .stat-card {
    padding: 20px;
  }

  .stat-card__content {
    gap: 12px;
  }

  .stat-card__icon {
    width: 48px;
    height: 48px;
  }

  .stat-card__icon :deep(.el-icon) {
    font-size: 24px;
  }

  .value-number {
    font-size: var(--font-size-2xl);
  }
}

/* 紧凑模式适配 */
.compact .stat-card {
  padding: 20px;
}

.compact .stat-card__content {
  gap: 12px;
}

.compact .stat-card__icon {
  width: 48px;
  height: 48px;
}

.compact .value-number {
  font-size: var(--font-size-2xl);
}

/* 暗色模式适配 */
.dark .stat-card {
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-darker);
}

.dark .stat-card--primary .stat-card__icon {
  background: rgba(59, 130, 246, 0.2);
}

.dark .stat-card--success .stat-card__icon {
  background: rgba(34, 197, 94, 0.2);
}

.dark .stat-card--warning .stat-card__icon {
  background: rgba(234, 179, 8, 0.2);
}

.dark .stat-card--danger .stat-card__icon {
  background: rgba(239, 68, 68, 0.2);
}
</style>