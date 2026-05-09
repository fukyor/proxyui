<script setup>
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import {
  Database,
  History,
  LayoutDashboard,
  LockKeyhole,
  Network,
  RefreshCw,
  Route as RouteIcon,
  Settings,
  ShieldAlert,
  Sparkles,
  Terminal
} from 'lucide-vue-next'
import { useWebSocketStore } from '@/stores/websocket'

const route = useRoute()
const wsStore = useWebSocketStore()
const syncingConfig = ref(false)

const connectedAddress = computed(() => {
  return wsStore.apiUrl ? wsStore.apiUrl.replace(/^https?:\/\//, '') : '未知地址'
})

const coreStatusText = computed(() => {
  return wsStore.isConnected ? `已连接 · ${connectedAddress.value}` : '未连接'
})

const navItems = [
  { to: '/dashboard/overview', label: '概览', icon: LayoutDashboard },
  { to: '/dashboard/connections', label: '详细连接', icon: Network },
  { to: '/dashboard/history-connections', label: '历史连接', icon: History },
  { to: '/dashboard/logs', label: '日志', icon: Terminal },
  { to: '/dashboard/mitm', label: 'MITM 抓包', icon: ShieldAlert },
  { to: '/dashboard/route-config', label: '路由配置', icon: RouteIcon },
  { to: '/dashboard/security-policy/access-control', label: '安全策略', icon: LockKeyhole, group: 'security' },
  { to: '/dashboard/storage-config', label: '存储配置', icon: Database },
  { to: '/dashboard/advanced-config', label: '高级设置', icon: Settings }
]

function isItemActive(item) {
  if (item.group === 'security') {
    return route.path.startsWith('/dashboard/security-policy')
  }
  return route.path === item.to
}

async function syncConfig() {
  syncingConfig.value = true
  try {
    await wsStore.loadConfig()
  } finally {
    syncingConfig.value = false
  }
}
</script>

<template>
  <div class="dashboard-container">
    <aside class="sidebar" aria-label="主导航">
      <div class="sidebar-brand">
        <div class="brand-mark">
          <Sparkles :size="19" stroke-width="3" />
        </div>
        <span>PROXY MAN</span>
      </div>

      <nav class="nav-menu">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: isItemActive(item) }"
        >
          <component :is="item.icon" class="nav-icon" :size="24" stroke-width="2.25" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <div class="core-card">
          <div class="core-status-row">
            <div class="core-copy">
              <div class="footer-title">代理核心</div>
              <div class="footer-url">{{ coreStatusText }}</div>
            </div>
            <span class="core-badge" :class="{ offline: !wsStore.isConnected }">
              <span class="core-badge-dot"></span>
              <span>{{ wsStore.isConnected ? '在线' : '离线' }}</span>
            </span>
          </div>
          <button
            class="core-refresh-button"
            :disabled="syncingConfig"
            aria-label="刷新配置"
            @click="syncConfig"
          >
            <RefreshCw :size="14" :class="{ spinning: syncingConfig }" />
            <span>刷新配置</span>
          </button>
        </div>
      </div>
    </aside>

    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.dashboard-container {
  --dashboard-scale: 1;
  --dashboard-width-scale: 1;
  --dashboard-height-scale: 1;
  display: flex;
  width: calc(100% * var(--dashboard-width-scale));
  min-height: calc(100vh * var(--dashboard-height-scale));
  background: var(--pm-bg);
  color: var(--pm-text);
  zoom: var(--dashboard-scale);
}

@media (min-resolution: 1.2dppx) and (max-resolution: 1.3dppx) {
  .dashboard-container {
    --dashboard-scale: 1.1;
    --dashboard-width-scale: 1;
    --dashboard-height-scale: 1;
  }
}

.sidebar {
  position: sticky;
  top: 0;
  display: flex;
  width: 264px;
  height: calc(100vh * var(--dashboard-height-scale));
  flex: 0 0 264px;
  flex-direction: column;
  background: var(--pm-sidebar);
  box-shadow: inset -1px 0 0 var(--pm-border);
  overflow: hidden;
}

.sidebar-brand {
  display: flex;
  height: 88px;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  padding: 0 32px;
  border-bottom: 1px solid var(--pm-border);
  color: var(--pm-primary);
  font-family: var(--pm-mono);
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0;
}

.brand-mark {
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--pm-primary);
  color: #111111;
}

.nav-menu {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 0;
  overflow-y: auto;
  padding: 24px 0;
}

.nav-item {
  display: flex;
  width: calc(100% - 16px);
  min-height: 48px;
  align-items: center;
  gap: 16px;
  margin-left: 16px;
  padding: 0 16px;
  border-radius: 999px;
  color: var(--pm-text);
  text-decoration: none;
  transition:
    background 0.18s ease,
    color 0.18s ease;
}

.nav-item:hover {
  background: #222226;
}

.nav-item.active {
  background: #2b2b31;
  color: var(--pm-text);
}

.nav-item.active .nav-icon {
  color: var(--pm-primary);
}

.nav-icon {
  flex: 0 0 auto;
  color: currentColor;
}

.nav-item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  font-weight: 600;
}

.spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.sidebar-footer {
  display: flex;
  min-height: 132px;
  flex: 0 0 132px;
  align-items: flex-start;
  padding: 12px 16px;
  background: var(--pm-sidebar);
  box-shadow: inset 0 1px 0 var(--pm-border);
  color: var(--pm-muted);
}

.core-card {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: #111111;
}

.core-status-row {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.core-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.footer-title {
  color: var(--pm-text);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
}

.footer-url {
  max-width: 166px;
  overflow: hidden;
  color: var(--pm-muted);
  font-size: 11px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.core-badge {
  display: inline-flex;
  min-height: 26px;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  background: #222924;
  padding: 5px 8px;
  color: var(--pm-success);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.core-badge.offline {
  background: #24100b;
  color: var(--pm-danger);
}

.core-badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.core-refresh-button {
  display: inline-flex;
  width: 100%;
  height: 34px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #ff9a2a;
  border-radius: 6px;
  background: var(--pm-primary);
  color: #111111;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    opacity 0.18s ease;
}

.core-refresh-button:hover:not(:disabled) {
  border-color: var(--pm-primary-hover);
  background: var(--pm-primary-hover);
}

.core-refresh-button:disabled {
  opacity: 0.72;
  cursor: wait;
}

.main-content {
  flex: 1;
  min-width: 0;
  height: calc(100vh * var(--dashboard-height-scale));
  overflow: auto;
  background: var(--pm-bg);
}

@media (max-width: 900px) {
  .sidebar {
    width: 84px;
    flex-basis: 84px;
  }

  .sidebar-brand {
    justify-content: center;
    padding: 0;
  }

  .sidebar-brand span,
  .nav-item span,
  .sidebar-footer {
    display: none;
  }

  .nav-menu {
    padding: 20px 12px;
  }

  .nav-item {
    width: 100%;
    justify-content: center;
    margin-left: 0;
    padding: 0;
  }
}
</style>
