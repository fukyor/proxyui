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
      <div class="module-header-copy">
        <h2>安全策略</h2>
        <p>访问控制、拦截日志和用户来源流量统一入口。</p>
      </div>
      <div id="security-policy-header-actions" class="module-header-actions"></div>
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
  color: var(--pm-text);
  padding: 28px 32px;
  background: var(--pm-bg);
}

.module-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.module-header h2 {
  font-size: 26px;
  font-weight: 600;
  margin: 0;
  color: var(--pm-text);
}

.module-header p {
  margin: 8px 0 0;
  color: var(--pm-muted);
}

.module-header-actions {
  display: flex;
  flex-shrink: 0;
}

.module-header-actions:empty {
  display: none;
}

/* 二级导航 */
.sub-nav {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--pm-border);
  padding-bottom: 0;
}

.sub-nav-item {
  padding: 10px 4px;
  color: var(--pm-muted);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
  font-size: 0.9rem;
  position: relative;
  top: 1px;
}

.sub-nav-item:hover {
  color: var(--pm-text);
  background-color: transparent;
}

.sub-nav-item.active {
  color: var(--pm-primary);
  border-bottom-color: var(--pm-primary);
  font-weight: 800;
}

/* 子页面内容区域 */
.sub-content {
  flex: 1;
  overflow-y: auto;
}

@media (max-width: 760px) {
  .security-policy-layout {
    padding: 20px;
  }
}
</style>
