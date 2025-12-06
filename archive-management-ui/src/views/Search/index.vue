<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSearchStore } from '@/stores/search'
import { useAppStore } from '@/stores/app'
import GlobalSearchInput from '@/components/common/GlobalSearchInput.vue'
import { Document, Upload, List } from '@element-plus/icons-vue'

const router = useRouter()
const searchStore = useSearchStore()
const appStore = useAppStore()

// 处理搜索
const handleSearch = async (keyword: string) => {
  const success = await searchStore.executeSearch(keyword)
  if (success && searchStore.hasResults) {
    // 跳转到档案列表页面并传递搜索参数
    router.push({
      path: '/archive',
      query: {
        searchKey: keyword
      }
    })
  }
}

// 处理组件挂载
onMounted(() => {
  appStore.setLoading(false)
  searchStore.initSearch()
})
</script>

<template>
  <div class="search-page">
    <!-- 背景装饰 -->
    <div class="search-background">
      <div class="bg-shape shape-1"></div>
      <div class="bg-shape shape-2"></div>
      <div class="bg-shape shape-3"></div>
    </div>

    <!-- 固定的头部区域 -->
    <div class="search-header">
      <div class="search-content-header">
        <!-- Logo区域 -->
        <div class="search-logo">
          <div class="logo-content">
            <i class="bi bi-archive-fill logo-icon"></i>
            <h1 class="logo-text">正成档案管理</h1>
          </div>
        </div>

        <!-- 搜索区域 -->
        <div class="search-area">
          <GlobalSearchInput
            size="large"
            width="600px"
            autofocus
            placeholder="搜索档案、文件名或内容"
            @search="handleSearch"
          />
        </div>
      </div>
    </div>

    <!-- 可滚动的内容区域 -->
    <div class="search-body">
      <div class="search-content-body">
        <!-- 搜索结果预览 -->
        <div v-if="searchStore.hasResults && !searchStore.loading" class="search-preview">
          <div class="preview-content">
            <h3 class="preview-title">找到 {{ searchStore.totalResults }} 个相关档案</h3>
            <p class="preview-description">
              点击"档案搜索"查看完整结果，或继续输入关键词进行更精确的搜索
            </p>
          </div>
        </div>

        <!-- 快速搜索建议 -->
        <div v-if="searchStore.hasQuery && !searchStore.hasResults && !searchStore.loading" class="search-suggestions">
          <div class="suggestions-content">
            <h3 class="suggestions-title">搜索建议</h3>
            <div class="suggestions-list">
              <button
                v-for="suggestion in ['文档搜索', '档案管理', '文件检索', '技术规范']"
                :key="suggestion"
                class="suggestion-item"
                @click="handleSearch(suggestion)"
              >
                {{ suggestion }}
              </button>
            </div>
          </div>
        </div>



        <!-- 最近搜索 -->
        <div v-if="searchStore.recentSearches.length > 0" class="recent-searches">
          <div class="recent-searches-content">
            <h3 class="recent-title">最近搜索</h3>
            <div class="recent-list">
              <button
                v-for="historyItem in searchStore.recentSearches.slice(0, 5)"
                :key="historyItem.id"
                class="recent-item"
                @click="searchStore.searchFromHistory(historyItem)"
              >
                <span class="recent-keyword">{{ historyItem.keyword }}</span>
                <span class="recent-count">{{ historyItem.resultCount }} 个结果</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  position: relative;
  padding: 40px 20px;
}

.search-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 0;
}

.bg-shape {
  position: absolute;
  border-radius: 50%;
  background: rgba(64, 158, 255, 0.1);
  animation: float 8s ease-in-out infinite;
}

.shape-1 {
  width: 300px;
  height: 300px;
  top: 10%;
  left: 15%;
  animation-delay: 0s;
}

.shape-2 {
  width: 200px;
  height: 200px;
  top: 60%;
  right: 20%;
  animation-delay: 2s;
}

.shape-3 {
  width: 150px;
  height: 150px;
  bottom: 20%;
  left: 25%;
  animation-delay: 4s;
}

.search-header {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: center;
  padding: 16px 0 24px 0;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.search-content-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  max-width: 800px;
  width: 100%;
}

.search-logo {
  text-align: center;
}

.logo-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  font-size: 32px;
  color: var(--primary-color);
}

.logo-text {
  font-size: 28px;
  font-weight: 400;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: 0.5px;
}

.search-area {
  width: 100%;
  display: flex;
  justify-content: center;
}

.search-body {
  flex: 1;
  position: relative;
  z-index: 1;
  overflow-y: auto;
  padding: 0 0 40px 0;
  display: flex;
  justify-content: center;
}

.search-content-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  max-width: 800px;
  width: 100%;
  padding: 0 20px;
}

.search-preview,
.search-suggestions,
.recent-searches {
  width: 100%;
  text-align: center;
}

.preview-content,
.suggestions-content,
.recent-searches-content {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.preview-title,
.suggestions-title,
.recent-title {
  font-size: 18px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.preview-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

.suggestions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.suggestion-item {
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.suggestion-item:hover {
  background: var(--primary-dark);
  transform: translateY(-1px);
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.recent-item {
  background: transparent;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 400px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.recent-item:hover {
  border-color: var(--primary-color);
  background: rgba(64, 158, 255, 0.05);
}

.recent-keyword {
  font-weight: 500;
  text-align: left;
  flex: 1;
}

.recent-count {
  font-size: 12px;
  color: var(--text-secondary);
  opacity: 0.8;
}

.quick-links {
  margin-top: 24px;
}

.links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  width: 100%;
  max-width: 600px;
}

.link-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 16px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  color: var(--text-primary);
  text-decoration: none;
  transition: all 0.2s ease;
  backdrop-filter: blur(5px);
}

.link-item:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: var(--primary-color);
  transform: translateY(-2px);
  text-decoration: none;
}

.link-item .el-icon {
  font-size: 24px;
  color: var(--primary-color);
}

.link-item span {
  font-size: 14px;
  font-weight: 500;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .search-page {
    padding: 24px 16px;
  }

  .search-header {
    padding: 12px 0 20px 0;
  }

  .search-content-header {
    gap: 16px;
    max-width: 600px;
  }

  .logo-icon {
    font-size: 28px;
  }

  .logo-text {
    font-size: 24px;
  }

  .search-content-body {
    gap: 20px;
    padding: 0 16px;
  }

  .preview-content,
  .suggestions-content,
  .recent-searches-content {
    padding: 20px;
  }

  .suggestions-list {
    gap: 6px;
  }

  .suggestion-item {
    font-size: 13px;
    padding: 6px 12px;
  }

  .links-grid {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 8px;
  }

  .link-item {
    padding: 16px 12px;
  }

  .link-item .el-icon {
    font-size: 20px;
  }

  .link-item span {
    font-size: 13px;
  }

  .recent-item {
    max-width: 350px;
  }
}

@media (max-width: 480px) {
  .search-page {
    padding: 16px 12px;
  }

  .search-header {
    padding: 10px 0 16px 0;
  }

  .search-content-header {
    gap: 12px;
    max-width: 100%;
  }

  .logo-icon {
    font-size: 24px;
  }

  .logo-text {
    font-size: 20px;
  }

  .search-content-body {
    gap: 16px;
    padding: 0 12px;
  }

  .preview-content,
  .suggestions-content,
  .recent-searches-content {
    padding: 16px;
    margin-bottom: 0;
  }

  .preview-title,
  .suggestions-title,
  .recent-title {
    font-size: 16px;
    margin-bottom: 12px;
  }

  .preview-description {
    font-size: 13px;
  }

  .links-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    max-width: 300px;
  }

  .link-item {
    padding: 12px 8px;
  }

  .link-item .el-icon {
    font-size: 18px;
  }

  .link-item span {
    font-size: 12px;
  }

  .recent-item {
    max-width: 280px;
    padding: 10px 12px;
  }
}

/* 暗色模式适配 */
.dark .search-page {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d3748 100%);
}

.dark .search-header {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d3748 100%);
}

.dark .preview-content,
.dark .suggestions-content,
.dark .recent-searches-content {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.dark .link-item {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: var(--text-primary);
}

.dark .link-item:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: var(--primary-color);
}

.dark .recent-item {
  border-color: var(--el-border-color);
  color: var(--text-primary);
}

.dark .recent-item:hover {
  border-color: var(--primary-color);
  background: rgba(64, 158, 255, 0.1);
}

/* 动画 */
@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
    opacity: 0.6;
  }
  33% {
    transform: translateY(-20px) rotate(120deg);
    opacity: 0.8;
  }
  66% {
    transform: translateY(-10px) rotate(240deg);
    opacity: 0.4;
  }
}
</style>