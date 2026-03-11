<script setup>
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { ref, onMounted, watch } from 'vue'

const route = useRoute()

// 展开的菜单项
const expandedMenus = ref(new Set())

// 从 localStorage 恢复展开状态
onMounted(() => {
  const saved = localStorage.getItem('expandedMenus')
  if (saved) {
    try {
      expandedMenus.value = new Set(JSON.parse(saved))
    } catch (e) {
      console.error('Failed to parse expandedMenus:', e)
    }
  }

  // 如果当前路由是子页面，自动展开父菜单
  if (route.path.startsWith('/dashboard/security-policy/')) {
    expandedMenus.value.add('security-policy')
    saveExpandedState()
  }
})

// 监听路由变化，自动展开对应的父菜单
watch(() => route.path, (newPath) => {
  if (newPath.startsWith('/dashboard/security-policy/')) {
    expandedMenus.value.add('security-policy')
    saveExpandedState()
  }
})

// 切换展开状态
function toggleMenu(menuId) {
  if (expandedMenus.value.has(menuId)) {
    expandedMenus.value.delete(menuId)
  } else {
    expandedMenus.value.add(menuId)
  }
  saveExpandedState()
}

// 保存展开状态到 localStorage
function saveExpandedState() {
  localStorage.setItem('expandedMenus', JSON.stringify([...expandedMenus.value]))
}

// 检查菜单项是否激活
function isSecurityPolicyActive() {
  return route.path.startsWith('/dashboard/security-policy')
}
</script>

<template>
  <div class="dashboard-container">
    <aside class="sidebar">
      <!-- Logo or Header -->
      <div class="sidebar-header">
        <svg
          width="40"
          height="40"
          viewBox="0 0 100 100"
          fill="none"
          stroke="#cba376"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M25 75 L25 40 L15 20 L40 30 L60 30 L85 20 L75 40 L75 75 Q50 85 25 75 Z" />
          <circle cx="38" cy="48" r="3" />
          <circle cx="62" cy="48" r="3" />
          <path d="M45 60 Q50 63 55 60" />
        </svg>
      </div>

      <nav class="nav-menu">
        <RouterLink to="/dashboard/overview" class="nav-item" active-class="active">
          <!-- Icon for Overview -->
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <span>概览</span>
        </RouterLink>

        <RouterLink to="/dashboard/connections" class="nav-item" active-class="active">
          <!-- Icon for Connections -->
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="6" cy="6" r="3"></circle>
            <circle cx="18" cy="6" r="3"></circle>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="18" r="3"></circle>
            <line x1="9" y1="6" x2="15" y2="6"></line>
            <line x1="6" y1="9" x2="6" y2="15"></line>
            <line x1="18" y1="9" x2="18" y2="15"></line>
            <line x1="9" y1="18" x2="15" y2="18"></line>
          </svg>
          <span>详细连接</span>
        </RouterLink>

        <RouterLink to="/dashboard/history-connections" class="nav-item" active-class="active">
          <!-- Icon for History Connections -->
           <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>历史连接</span>
        </RouterLink>

        <RouterLink to="/dashboard/logs" class="nav-item" active-class="active">
          <!-- Icon for Logs -->
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span>日志</span>
        </RouterLink>

        <RouterLink to="/dashboard/mitm" class="nav-item" active-class="active">
          <!-- Icon for MITM -->
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <path d="M12 8v4"></path>
            <path d="M12 16h.01"></path>
          </svg>
          <span>MITM</span>
        </RouterLink>

        <RouterLink to="/dashboard/route-config" class="nav-item" active-class="active">
          <!-- Icon for Route Config -->
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
            <path d="M4.93 4.93a10 10 0 0 0 0 14.14"></path>
            <path d="M12 2v2"></path>
            <path d="M12 20v2"></path>
            <path d="M2 12h2"></path>
            <path d="M20 12h2"></path>
          </svg>
          <span>路由配置</span>
        </RouterLink>

        <div class="nav-item-wrapper">
          <div
            class="nav-item parent-nav-item"
            :class="{ active: isSecurityPolicyActive() }"
            @click="toggleMenu('security-policy')"
          >
            <!-- Icon for Security Policy（盾牌） -->
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <line x1="9" y1="12" x2="11" y2="14"></line>
              <line x1="15" y1="10" x2="11" y2="14"></line>
            </svg>
            <span>安全策略</span>
            <!-- 展开/折叠指示器 -->
            <svg
              class="expand-icon"
              :class="{ expanded: expandedMenus.has('security-policy') }"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>

          <!-- 子菜单 -->
          <div class="sub-menu" v-show="expandedMenus.has('security-policy')">
            <RouterLink to="/dashboard/security-policy/access-control" class="nav-item sub-nav-item" active-class="active">
              <span class="sub-item-dot">•</span>
              <span>访问控制</span>
            </RouterLink>
            <RouterLink to="/dashboard/security-policy/user-monitoring" class="nav-item sub-nav-item" active-class="active">
              <span class="sub-item-dot">•</span>
              <span>用户监控</span>
            </RouterLink>
          </div>
        </div>

        <RouterLink to="/dashboard/storage-config" class="nav-item" active-class="active">
          <!-- Icon for Storage Config（数据库桶）-->
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
          </svg>
          <span>存储配置</span>
        </RouterLink>

        <RouterLink to="/dashboard/advanced-config" class="nav-item" active-class="active">
          <!-- Icon for Advanced Config -->
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          <span>高级设置</span>
        </RouterLink>
      </nav>
    </aside>

    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.dashboard-container {
  display: flex;
  height: 100vh;
  width: 100%;
  background-color: #1a1a1a;
  color: #cba376;
}

.sidebar {
  width: 200px;
  background-color: #222;
  display: flex;
  flex-direction: column;
  padding: 20px 10px;
  border-right: 1px solid #333;
}

.sidebar-header {
  display: flex;
  justify-content: center;
  margin-bottom: 40px;
  margin-top: 20px;
}

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 15px;
  color: #888;
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.3s;
}

.nav-item:hover {
  background-color: rgba(203, 163, 118, 0.1);
  color: #cba376;
}

.nav-item.active {
  background-color: rgba(203, 163, 118, 0.15);
  color: #cba376;
  font-weight: 500;
}

/* 父菜单项样式 */
.nav-item-wrapper {
  display: flex;
  flex-direction: column;
}

.parent-nav-item {
  cursor: pointer;
  position: relative;
}

.expand-icon {
  margin-left: auto;
  transition: transform 0.3s;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

/* 子菜单样式 */
.sub-menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
  margin-bottom: 6px;
}

.sub-nav-item {
  padding-left: 40px !important;
  font-size: 0.85rem;
  gap: 8px;
}

.sub-item-dot {
  font-size: 1.2rem;
  line-height: 1;
  color: #666;
}

.sub-nav-item.active .sub-item-dot {
  color: #cba376;
}

.main-content {
  flex-grow: 1;
  padding: 20px;
  overflow-y: auto;
}
</style>
