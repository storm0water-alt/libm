<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ElButton, ElIcon, ElMessage } from 'element-plus'
import { Search, Close } from '@element-plus/icons-vue'
import { useSearchStore } from '@/stores/search'

interface Props {
  modelValue?: string
  placeholder?: string
  disabled?: boolean
  size?: 'large' | 'default' | 'small'
  showClearButton?: boolean
  autofocus?: boolean
  width?: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'search', keyword: string): void
  (e: 'clear'): void
  (e: 'focus'): void
  (e: 'blur'): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '',
  disabled: false,
  size: 'large',
  showClearButton: true,
  autofocus: false,
  width: '600px'
})

const emit = defineEmits<Emits>()

const searchStore = useSearchStore()

// 响应式数据
const searchInput = ref(props.modelValue)
const isFocused = ref(false)
const inputRef = ref<HTMLInputElement>()

// 计算属性
const canSearch = computed(() => searchInput.value.trim().length > 0)
const isLoading = computed(() => searchStore.loading)

// 监听输入变化
watch(searchInput, (newValue) => {
  emit('update:modelValue', newValue)
  // 移除自动搜索，只更新输入值
})

// 监听模型值变化
watch(() => props.modelValue, (newValue) => {
  if (newValue !== searchInput.value) {
    searchInput.value = newValue
  }
})

// 处理输入
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  searchInput.value = target.value
}

// 处理焦点
const handleFocus = () => {
  isFocused.value = true
  emit('focus')
}

// 处理失焦
const handleBlur = () => {
  isFocused.value = false
  emit('blur')
}

// 处理搜索按钮点击
const handleSearch = () => {
  if (canSearch.value && !isLoading.value) {
    const keyword = searchInput.value.trim()
    emit('search', keyword)
  }
}

// 处理清空
const handleClear = () => {
  searchInput.value = ''
  emit('update:modelValue', '')
  emit('clear')
  inputRef.value?.focus()
}


// 处理键盘事件
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    handleSearch()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    handleClear()
  }
}

// 自动聚焦
onMounted(() => {
  if (props.autofocus) {
    inputRef.value?.focus()
  }
})

// 组件卸载时的清理
onUnmounted(() => {
  // 清理逻辑
})

// 暴露方法给父组件
defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  clear: handleClear
})
</script>

<template>
  <div class="global-search-input" :style="{ width: width }">
    <div class="search-container" :class="{ 'search-container--focused': isFocused }">
      <!-- 搜索图标 -->
      <div class="search-icon">
        <el-icon :size="18">
          <Search />
        </el-icon>
      </div>

      <!-- 搜索输入框 -->
      <input
        ref="inputRef"
        v-model="searchInput"
        type="text"
        class="search-input"
        :class="`search-input--${size}`"
        :placeholder="placeholder || '搜索档案'"
        :disabled="disabled"
        :readonly="isLoading"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeydown"
        autocomplete="off"
      />

      <!-- 清空按钮 -->
      <transition name="fade">
        <button
          v-if="showClearButton && searchInput && !disabled && !isLoading"
          class="clear-button"
          @click="handleClear"
          type="button"
          aria-label="清空搜索"
        >
          <el-icon :size="14">
            <Close />
          </el-icon>
        </button>
      </transition>

      <!-- 加载状态 -->
      <transition name="fade">
        <div v-if="isLoading" class="loading-indicator">
          <div class="loading-spinner"></div>
        </div>
      </transition>
    </div>

    <!-- 搜索按钮 -->
    <div class="search-actions">
      <el-button
        type="primary"
        :size="size"
        :disabled="!canSearch || disabled || isLoading"
        :loading="isLoading"
        @click="handleSearch"
        class="search-button"
      >
        档案搜索
      </el-button>
    </div>

  </div>
</template>

<style scoped>
.global-search-input {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 600px;
}

.search-container {
  display: flex;
  align-items: center;
  position: relative;
  width: 100%;
  height: 44px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 24px;
  transition: all 0.2s ease;
  overflow: hidden;
}

.search-container:hover {
  border-color: var(--el-border-color-hover);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.search-container--focused {
  border-color: var(--primary-color);
  box-shadow: 0 1px 6px rgba(64, 158, 255, 0.2);
}

.search-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 16px;
  color: var(--el-text-color-secondary);
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 16px;
  color: var(--el-text-color-primary);
  padding: 0;
  margin: 0 16px;
  width: calc(100% - 80px);
  font-family: inherit;
}

.search-input::placeholder {
  color: var(--el-text-color-placeholder);
}

.search-input:disabled {
  color: var(--el-text-color-disabled);
  cursor: not-allowed;
}

.search-input:focus {
  outline: none;
}

.search-input--small {
  font-size: 14px;
  height: 32px;
}

.search-input--large {
  font-size: 18px;
  height: 56px;
}

.clear-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 50%;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  margin-right: 8px;
}

.clear-button:hover {
  background-color: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-right: 8px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--el-border-color-light);
  border-top: 2px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.search-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-button {
  min-width: 120px;
  height: 44px;
  border-radius: 24px;
  font-weight: 500;
  background-color: #f8f9fa;
  border-color: #f8f9fa;
  color: var(--el-text-color-primary);
}

.search-button:hover {
  background-color: #e9ecef;
  border-color: #e9ecef;
}

.search-button:disabled {
  background-color: var(--el-fill-color-light);
  border-color: var(--el-fill-color-light);
  color: var(--el-text-color-disabled);
}

.search-button:not(:disabled):active {
  background-color: #dee2e6;
  border-color: #dee2e6;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

/* 响应式适配 */
@media (max-width: 768px) {
  .global-search-input {
    width: 100%;
    max-width: none;
    gap: 12px;
  }

  .search-container {
    height: 40px;
  }

  .search-input {
    font-size: 14px;
    padding: 0 12px;
  }

  .search-icon {
    padding-left: 12px;
  }

  .clear-button {
    width: 28px;
    height: 28px;
    margin-right: 6px;
  }

  .loading-indicator {
    width: 28px;
    height: 28px;
    margin-right: 6px;
  }

  .search-button,
  .advanced-button {
    height: 40px;
    font-size: 14px;
  }

  .search-button {
    min-width: 100px;
  }
}

@media (max-width: 480px) {
  .global-search-input {
    gap: 8px;
  }

  .search-container {
    height: 36px;
  }

  .search-input {
    font-size: 14px;
    padding: 0 10px;
  }

  .search-icon {
    padding-left: 10px;
  }

  .clear-button {
    width: 24px;
    height: 24px;
    margin-right: 4px;
  }

  .loading-indicator {
    width: 24px;
    height: 24px;
    margin-right: 4px;
  }

  .search-actions,
  .advanced-actions {
    gap: 8px;
    flex-direction: column;
    width: 100%;
    align-items: stretch;
  }

  .search-button,
  .advanced-button {
    height: 36px;
    font-size: 13px;
    width: 100%;
  }

  .search-button {
    min-width: auto;
  }
}

/* 暗色模式适配 */
.dark .search-container {
  background-color: var(--el-bg-color-overlay);
  border-color: var(--el-border-color-darker);
}

.dark .search-container:hover {
  border-color: var(--el-border-color);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.dark .search-container--focused {
  border-color: var(--primary-color);
  box-shadow: 0 1px 6px rgba(64, 158, 255, 0.3);
}

.dark .search-button {
  background-color: var(--el-fill-color-darker);
  border-color: var(--el-fill-color-darker);
  color: var(--el-text-color-primary);
}

.dark .search-button:hover {
  background-color: var(--el-fill-color-dark);
  border-color: var(--el-fill-color-dark);
}

.dark .search-button:disabled {
  background-color: var(--el-fill-color-light);
  border-color: var(--el-fill-color-light);
}

/* 动画 */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>