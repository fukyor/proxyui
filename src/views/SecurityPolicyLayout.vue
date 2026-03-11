<script setup>
import { RouterView, useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()

// 二级导航配置
const subPages = [
  { path: '/dashboard/security-policy/access-control', label: '访问控制', name: 'access-control' },
  { path: '/dashboard/security-policy/user-monitoring', label: '用户监控', name: 'user-monitoring' }
]

// 当前激活的子页面
const activeTab = computed(() => {
  return subPages.find(page => route.path.startsWith(page.path))?.name || 'access-control'
})
</script>

<template>
  <div class="security-policy-layout">
    <!-- 模块标题 -->
    <div class="module-header">
      <h2>安全策略</h2>
    </div>

    <!-- 二级导航 -->
    <nav class="sub-nav">
      <RouterLink
        v-for="page in subPages"
        :key="page.name"
        :to="page.path"
        class="sub-nav-item"
        :class="{ active: activeTab === page.name }"
      >
        {{ page.label }}
      </RouterLink>
    </nav>

    <!-- 子页面内容 -->
    <div class="sub-content">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.security-policy-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: #cba376;
}

.module-header {
  margin-bottom: 20px;
}

.module-header h2 {
  font-size: 1.6rem;
  font-weight: 600;
  margin: 0;
  color: #cba376;
}

/* 二级导航 */
.sub-nav {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid #333;
  padding-bottom: 0;
}

.sub-nav-item {
  padding: 10px 20px;
  color: #888;
  text-decoration: none;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
  font-size: 0.9rem;
  position: relative;
  top: 1px;
}

.sub-nav-item:hover {
  color: #cba376;
  background-color: rgba(203, 163, 118, 0.05);
}

.sub-nav-item.active {
  color: #cba376;
  border-bottom-color: #cba376;
  font-weight: 500;
}

/* 子页面内容区域 */
.sub-content {
  flex: 1;
  overflow-y: auto;
}
</style>
