<template>
  <div class="overview">
    <section class="overview-top">
      <div class="metric-board">
        <div class="metric-row">
          <article v-for="metric in topMetricRow" :key="metric.label" class="metric-card">
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
            <em>{{ metric.source }}</em>
          </article>
        </div>
        <div class="metric-row">
          <article v-for="metric in bottomMetricRow" :key="metric.label" class="metric-card">
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
            <em>{{ metric.source }}</em>
          </article>
        </div>
      </div>

      <article class="policy-card">
        <div class="policy-head">
          <div class="policy-title-group">
            <div class="policy-icon-wrap">
              <ShieldCheck :size="18" />
            </div>
            <h2>安全策略</h2>
          </div>
          <span
            class="policy-switch-dot"
            :class="{ active: isAccessEnabled }"
            :title="accessStatusText"
            :aria-label="accessStatusText"
          ></span>
        </div>

        <div class="policy-status-list">
          <div>
            <span>域名拦截规则</span>
            <strong>{{ enabledAccessRuleCount }} 条</strong>
          </div>
          <div>
            <span>用户封禁 IP</span>
            <strong>{{ blockedIpCount }} 个</strong>
          </div>
          <div>
            <span>拦截次数</span>
            <strong class="accent">{{ wsStore.interceptCount }} 次</strong>
          </div>
        </div>

        <div class="policy-divider"></div>

        <RouterLink class="policy-action" to="/dashboard/security-policy/access-control">
          查看策略
        </RouterLink>
      </article>

      <article class="policy-card route-policy-card">
        <div class="policy-head">
          <div class="policy-title-group">
            <div class="policy-icon-wrap route-icon-wrap">
              <RouteIcon :size="18" />
            </div>
            <h2>路由策略</h2>
          </div>
          <span
            class="policy-switch-dot"
            :class="{ active: isRouteEnabled }"
            :title="routeStatusText"
            :aria-label="routeStatusText"
          ></span>
        </div>

        <div class="policy-status-list">
          <div>
            <span>域名后缀规则</span>
            <strong>{{ domainSuffixRouteRuleCount }} 条</strong>
          </div>
          <div>
            <span>域名关键词规则</span>
            <strong>{{ domainKeywordRouteRuleCount }} 条</strong>
          </div>
          <div>
            <span>IP 精确规则</span>
            <strong class="accent route-accent">{{ ipRouteRuleCount }} 条</strong>
          </div>
        </div>

        <div class="policy-divider"></div>

        <RouterLink class="policy-action" to="/dashboard/route-config">
          查看路由
        </RouterLink>
      </article>

      <article class="user-card">
        <div class="user-head">
          <div>
            <h2>用户流量</h2>
            <p>按 IP 聚合 · 在线优先</p>
          </div>
          <span>{{ onlineUserCount }} 在线</span>
        </div>

        <div class="user-preview-area">
          <div class="user-preview-list">
            <div class="user-preview-grid">
              <div v-for="user in userPreviewRows" :key="user.key" class="user-preview-row">
                <div>
                  <strong>{{ user.ip }}</strong>
                  <small>{{ user.hostLabel }}</small>
                </div>
                <em>{{ user.totalLabel }}</em>
              </div>
            </div>
            <div class="fake-scroll-track"></div>
            <div class="fake-scroll-thumb"></div>
          </div>
          <RouterLink class="user-action" to="/dashboard/security-policy/user-monitoring">
            进入用户监控
          </RouterLink>
        </div>
      </article>
    </section>

    <section class="overview-main-stack">
      <article class="traffic-panel">
        <div class="overview-section-head">
          <div>
            <h2>实时流量</h2>
            <p>最近 60 秒上传 / 下载速率</p>
          </div>
          <div class="chart-legend">
            <span class="upload">上传</span>
            <span class="download">下载</span>
          </div>
        </div>
        <div class="chart-box">
          <canvas ref="chartCanvas"></canvas>
        </div>
      </article>

      <article class="connections-panel">
        <div class="overview-section-head">
          <div>
            <h2>活动连接 ({{ totalActiveCount }})</h2>
            <p>虚拟滚动渲染全部活动子连接</p>
          </div>
          <div class="connection-actions">
            <button class="connection-close" @click="handleCloseAll">关闭所有连接</button>
            <RouterLink class="connection-view" to="/dashboard/connections">查看全部连接</RouterLink>
          </div>
        </div>

        <div ref="connectionScrollerRef" class="connection-table">
          <div class="connection-row connection-header">
            <span>ID</span>
            <span>方法</span>
            <span>Host</span>
            <span>URL</span>
            <span>协议</span>
            <span>上传</span>
            <span>下载</span>
          </div>
          <div v-if="connections.length === 0" class="connection-empty">暂无活动连接</div>
          <div
            v-else
            class="connection-virtual-spacer"
            :style="{ height: connectionTotalSize + 'px' }"
          >
            <div
              v-for="virtualRow in connectionVirtualRows"
              :key="virtualRow.key"
              :ref="(el) => { if (el) connectionVirtualizer.measureElement(el) }"
              :data-index="virtualRow.index"
              class="connection-virtual-row"
              :style="{ transform: `translateY(${virtualRow.start}px)` }"
            >
              <div
                class="connection-row"
                :class="{ muted: virtualRow.index % 2 === 1 }"
              >
                <span>{{ connections[virtualRow.index].id }}</span>
                <span
                  class="method-cell"
                  :class="`method-${String(connections[virtualRow.index].method || '').toLowerCase()}`"
                >
                  {{ connections[virtualRow.index].method || '未知' }}
                </span>
                <span :title="connections[virtualRow.index].host">
                  {{ connections[virtualRow.index].host || '-' }}
                </span>
                <span :title="connections[virtualRow.index].url">
                  {{ connections[virtualRow.index].url || '-' }}
                </span>
                <span>{{ connections[virtualRow.index].protocol || '-' }}</span>
                <span>{{ formatBytes(connections[virtualRow.index].up || 0) }}</span>
                <span>{{ formatBytes(connections[virtualRow.index].down || 0) }}</span>
              </div>
            </div>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { RouterLink } from 'vue-router'
import { Chart, registerables } from 'chart.js'
import { Route as RouteIcon, ShieldCheck } from 'lucide-vue-next'
import { useWebSocketStore } from '@/stores/websocket'

Chart.register(...registerables)

const wsStore = useWebSocketStore()
const TRAFFIC_CHART_POINTS = 60
const TRAFFIC_CHART_IDLE_MAX = 1024
const TRAFFIC_CHART_MIN_ACTIVE_MAX = 512
const TRAFFIC_CHART_TINY_POINT_LIMIT = 1024
const TRAFFIC_CHART_HEADROOM = 1.4

const chartCanvas = ref(null)
const currentUpload = ref(0)
const currentDownload = ref(0)
const totalUpload = ref(0)
const totalDownload = ref(0)
const totalActiveCount = ref(0)
const connections = ref([])
const connectionScrollerRef = ref(null)

let chart = null
let unsubscribeTraffic = null
let unsubscribeConnections = null

const connectionVirtualizer = useVirtualizer(
  computed(() => ({
    count: connections.value.length,
    getScrollElement: () => connectionScrollerRef.value,
    estimateSize: () => 48,
    overscan: 10,
    getItemKey: (index) => connections.value[index]?.id ?? index
  }))
)

const connectionVirtualRows = computed(() => connectionVirtualizer.value.getVirtualItems())
const connectionTotalSize = computed(() => connectionVirtualizer.value.getTotalSize())

const enabledAccessRuleCount = computed(() => {
  const rules = wsStore.config?.AccessRules ?? []
  return rules.filter(rule => rule.Enable).length
})

const blockedIpSet = computed(() => {
  const rules = wsStore.config?.UserBlockRules ?? []
  const set = new Set()
  rules
    .filter(rule => rule.Enable)
    .forEach(rule => {
      String(rule.Value || '')
        .split(',')
        .map(value => value.trim())
        .filter(Boolean)
        .forEach(ip => set.add(ip))
    })
  return set
})

const blockedIpCount = computed(() => blockedIpSet.value.size)

const accessStatusText = computed(() => {
  if (!wsStore.config) return '配置未加载'
  return isAccessEnabled.value ? '访问控制已启用' : '访问控制未启用'
})

const isAccessEnabled = computed(() => {
  return Boolean(wsStore.config?.AccessEnable)
})

const enabledRouteRules = computed(() => {
  const rules = wsStore.config?.Routes ?? []
  return rules.filter(rule => rule.Enable)
})

const domainSuffixRouteRuleCount = computed(() => {
  return enabledRouteRules.value.filter(rule => rule.Type === 'DomainSuffix').length
})

const domainKeywordRouteRuleCount = computed(() => {
  return enabledRouteRules.value.filter(rule => rule.Type === 'DomainKeyword').length
})

const ipRouteRuleCount = computed(() => {
  return enabledRouteRules.value.filter(rule => rule.Type === 'IP').length
})

const routeStatusText = computed(() => {
  if (!wsStore.config) return '配置未加载'
  return isRouteEnabled.value ? '规则路由已启用' : '规则路由未启用'
})

const isRouteEnabled = computed(() => {
  return Boolean(wsStore.config?.RouteEnable)
})

const onlineUserCount = computed(() => {
  return wsStore.userTrafficList.filter(item => item.online).length
})

const topUsers = computed(() => {
  return [...wsStore.userTrafficList]
    .map(item => {
      const hosts = Array.isArray(item.hosts) ? item.hosts : []
      const topHost = [...hosts].sort((a, b) => {
        return ((b.up || 0) + (b.down || 0)) - ((a.up || 0) + (a.down || 0))
      })[0]
      return {
        ip: item.ip,
        online: Boolean(item.online),
        totalTraffic: (item.totalUp || 0) + (item.totalDown || 0),
        hostLabel: topHost?.host || `${hosts.length} 个 Host`
      }
    })
    .sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1
      return b.totalTraffic - a.totalTraffic
    })
    .slice(0, 4)
})

const userPreviewRows = computed(() => {
  const rows = topUsers.value.map(user => ({
    key: user.ip,
    ip: user.ip,
    hostLabel: user.hostLabel,
    totalLabel: formatBytes(user.totalTraffic)
  }))

  while (rows.length < 4) {
    const index = rows.length + 1
    rows.push({
      key: `empty-${index}`,
      ip: '-',
      hostLabel: '暂无数据',
      totalLabel: '0 B'
    })
  }
  return rows
})

const topMetricRow = computed(() => [
  { label: '总上传', value: formatBytes(totalUpload.value), source: '来自 traffic.totalUp' },
  { label: '上传速率', value: `${formatBytes(currentUpload.value)}/s`, source: '来自 traffic.up' }
])

const bottomMetricRow = computed(() => [
  { label: '下载速率', value: `${formatBytes(currentDownload.value)}/s`, source: '来自 traffic.down' },
  { label: '总下载', value: formatBytes(totalDownload.value), source: '来自 traffic.totalDown' }
])

function initChart() {
  if (!chartCanvas.value) return

  chart = new Chart(chartCanvas.value.getContext('2d'), {
    type: 'line',
    data: {
      labels: Array(TRAFFIC_CHART_POINTS).fill(''),
      datasets: [
        {
          label: '上传',
          data: Array(TRAFFIC_CHART_POINTS).fill(0),
          borderColor: '#ff8400',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: getTrafficPointRadius,
          pointHoverRadius: 4,
          tension: 0.35,
          fill: false
        },
        {
          label: '下载',
          data: Array(TRAFFIC_CHART_POINTS).fill(0),
          borderColor: '#b2b2ff',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: getTrafficPointRadius,
          pointHoverRadius: 4,
          tension: 0.35,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      interaction: {
        intersect: false,
        mode: 'index'
      },
      layout: {
        padding: {
          top: 4,
          right: 8,
          bottom: 0,
          left: 0
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: TRAFFIC_CHART_IDLE_MAX,
          grid: { color: 'rgba(46, 46, 46, 0.55)' },
          border: { color: '#2e2e2e' },
          ticks: {
            color: '#b8b9b6',
            font: {
              family: 'JetBrains Mono',
              size: 10
            },
            maxTicksLimit: 5,
            callback: value => formatBytes(value)
          }
        },
        x: {
          display: false,
          grid: { display: false },
          border: { color: '#2e2e2e' }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: context => `${context.dataset.label}: ${formatBytes(context.parsed.y)}/s`
          }
        }
      }
    }
  })
}

function getTrafficPointRadius(context) {
  const value = Number(context.raw) || 0
  if (value <= 0) return 0
  return value < TRAFFIC_CHART_TINY_POINT_LIMIT ? 2.5 : 0
}

function getTrafficSuggestedMax() {
  if (!chart) return TRAFFIC_CHART_IDLE_MAX

  const peak = chart.data.datasets.reduce((maxValue, dataset) => {
    const datasetPeak = dataset.data.reduce((datasetMax, value) => {
      return Math.max(datasetMax, Number(value) || 0)
    }, 0)
    return Math.max(maxValue, datasetPeak)
  }, 0)

  if (peak <= 0) return TRAFFIC_CHART_IDLE_MAX
  return Math.max(TRAFFIC_CHART_MIN_ACTIVE_MAX, Math.ceil(peak * TRAFFIC_CHART_HEADROOM))
}

function updateChart(data = {}) {
  const up = Number(data.up) || 0
  const down = Number(data.down) || 0

  currentUpload.value = up
  currentDownload.value = down
  totalUpload.value = data.totalUp == null ? totalUpload.value : Number(data.totalUp) || 0
  totalDownload.value = data.totalDown == null ? totalDownload.value : Number(data.totalDown) || 0

  if (!chart) return

  chart.data.datasets[0].data.push(up)
  chart.data.datasets[1].data.push(down)
  chart.data.datasets.forEach(dataset => {
    if (dataset.data.length > TRAFFIC_CHART_POINTS) dataset.data.shift()
  })
  chart.options.scales.y.suggestedMax = getTrafficSuggestedMax()
  chart.update('none')
}

function updateConnections(data = []) {
  const activeChildren = data.filter(conn => conn.parentId !== 0 && conn.status === 'Active')
  totalActiveCount.value = activeChildren.length
  connections.value = activeChildren
}

function handleCloseAll() {
  wsStore.closeAllConnections()
}

function formatBytes(bytes) {
  const numericBytes = Number(bytes) || 0
  if (numericBytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.max(0, Math.min(Math.floor(Math.log(numericBytes) / Math.log(k)), sizes.length - 1))
  const value = numericBytes / Math.pow(k, i)
  if (i === 0) return `${Math.round(value)} ${sizes[i]}`
  const rounded = Number(value.toFixed(1))
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} ${sizes[i]}`
}

onMounted(async () => {
  initChart()

  unsubscribeTraffic = wsStore.subscribeTraffic(updateChart)
  unsubscribeConnections = wsStore.subscribeConnections(updateConnections)
  wsStore.subscribeInterceptLogs()
  wsStore.subscribeUserTraffic()

  if (wsStore.trafficHistory.length > 0) {
    wsStore.trafficHistory.slice(-TRAFFIC_CHART_POINTS).forEach(updateChart)
  }
  if (wsStore.connections.length > 0) {
    updateConnections(wsStore.connections)
  }
  if (!wsStore.config) {
    await wsStore.loadConfig()
  }
  wsStore.loadStats().catch(() => {})
})

onUnmounted(() => {
  if (unsubscribeTraffic) unsubscribeTraffic()
  if (unsubscribeConnections) unsubscribeConnections()
  wsStore.unsubscribeInterceptLogs()
  wsStore.unsubscribeUserTraffic()
  if (chart) chart.destroy()
})
</script>

<style scoped>
.overview {
  position: relative;
  display: flex;
  min-height: 100vh;
  height: 100%;
  flex-direction: column;
  gap: 20px;
  padding: 28px 32px;
  background: var(--background, #111111);
}

.overview-top {
  display: grid;
  height: 232px;
  grid-template-columns: 1.5fr 1fr 1fr 1.1fr;
  gap: 14px;
  align-items: stretch;
}

.overview-top > * {
  height: 232px;
  min-height: 0;
}

.metric-board {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
  background: transparent;
}

.metric-row {
  display: grid;
  min-height: 0;
  flex: 1 1 0;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.metric-card,
.policy-card,
.user-card,
.traffic-panel,
.connections-panel {
  border: 1px solid var(--border, #2e2e2e);
  border-radius: 8px;
  background: var(--card, #1a1a1a);
}

.metric-card {
  display: flex;
  min-height: 0;
  min-width: 0;
  flex-direction: column;
  justify-content: flex-start;
  gap: 8px;
  padding: 16px;
}

.metric-card span,
.metric-card em,
.policy-head p,
.policy-status-list span,
.user-head p,
.user-preview-row small,
.overview-section-head p {
  color: var(--muted-foreground, #b8b9b6);
  font-family: var(--pm-font);
  font-weight: 400;
}

.metric-card span {
  font-size: 13px;
  line-height: 1.3;
}

.metric-card strong {
  overflow: hidden;
  color: var(--foreground, #ffffff);
  font-family: "JetBrains Mono", Consolas, monospace;
  font-size: 28px;
  line-height: 1.33;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-card em {
  overflow: hidden;
  font-size: 12px;
  line-height: 1.4;
  font-style: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.policy-card,
.user-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 16px;
}

.policy-card {
  gap: 10px;
}

.user-card {
  gap: 14px;
}

.policy-head,
.user-head,
.overview-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.policy-head {
  justify-content: space-between;
}

.policy-title-group {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.policy-switch-dot {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: #ff3b30;
  box-shadow: 0 0 0 4px rgba(255, 59, 48, 0.16), 0 0 14px rgba(255, 59, 48, 0.55);
}

.policy-switch-dot.active {
  background: #7ed957;
  box-shadow: 0 0 0 4px rgba(126, 217, 87, 0.18), 0 0 14px rgba(126, 217, 87, 0.58);
}

.policy-icon-wrap {
  display: inline-flex;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--color-warning, #291c0f);
  color: var(--color-warning-foreground, #ff8400);
}

.route-icon-wrap {
  background: var(--color-info, #222229);
  color: var(--color-info-foreground, #b2b2ff);
}

.policy-head h2,
.user-head h2,
.overview-section-head h2 {
  margin: 0;
  color: var(--foreground, #ffffff);
  font-size: 16px;
  line-height: 1.44;
  font-weight: 700;
}

.policy-head h2,
.user-head h2 {
  font-family: "JetBrains Mono", Consolas, monospace;
}

.overview-section-head h2 {
  font-family: var(--pm-font);
}

.policy-head p,
.user-head p,
.overview-section-head p {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 1.42;
}

.policy-status-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.policy-status-list div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 19px;
}

.policy-status-list span,
.policy-status-list strong {
  font-size: 13px;
  line-height: 1.46;
}

.policy-status-list strong {
  color: var(--foreground, #ffffff);
  font-family: "JetBrains Mono", Consolas, monospace;
  font-weight: 700;
}

.policy-status-list .accent {
  color: var(--color-warning-foreground, #ff8400);
}

.policy-status-list .route-accent {
  color: var(--color-info-foreground, #b2b2ff);
}

.policy-divider {
  height: 1px;
  background: var(--border, #2e2e2e);
}

.policy-action,
.user-action {
  display: inline-flex;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--primary, #ff8400);
  color: var(--primary-foreground, #111111);
  font-family: "JetBrains Mono", Consolas, monospace;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
}

.policy-action {
  width: 100%;
}

.user-head > span {
  display: inline-flex;
  min-height: 29px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--color-success, #222924);
  color: var(--color-success-foreground, #b6ffce);
  padding: 6px 10px;
  font-family: var(--pm-font);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.42;
}

.user-preview-area {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 14px;
}

.user-preview-list {
  position: relative;
  height: 82px;
  flex: 0 0 82px;
  overflow: hidden;
  background: var(--card, #1a1a1a);
}

.user-preview-grid {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}

.user-preview-row {
  display: flex;
  height: 38px;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid var(--border, #2e2e2e);
  border-radius: 6px;
  background: var(--background, #111111);
  padding: 0 8px;
}

.user-preview-row div {
  min-width: 0;
}

.user-preview-row strong,
.user-preview-row small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-preview-row strong,
.user-preview-row em {
  color: var(--foreground, #ffffff);
  font-family: "JetBrains Mono", Consolas, monospace;
  font-size: 12px;
  line-height: 1.31;
  font-weight: 400;
}

.user-preview-row small {
  margin-top: 2px;
  font-size: 10px;
  line-height: 1.27;
}

.user-preview-row em {
  flex: 0 0 auto;
  font-style: normal;
  font-weight: 700;
}

.user-action {
  width: 100%;
  flex: 0 0 auto;
}

.fake-scroll-track,
.fake-scroll-thumb {
  position: absolute;
  right: 0;
  width: 4px;
  border-radius: 999px;
}

.fake-scroll-track {
  top: 4px;
  height: 74px;
  background: var(--muted, #2e2e2e);
}

.fake-scroll-thumb {
  top: 8px;
  height: 28px;
  background: var(--primary, #ff8400);
}

.overview-main-stack {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 20px;
}

.traffic-panel {
  display: flex;
  height: 320px;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}

.connections-panel {
  display: flex;
  flex: 1;
  min-height: 252px;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
}

.chart-legend {
  display: flex;
  gap: 12px;
}

.chart-legend span {
  font-family: var(--pm-font);
  font-size: 12px;
  line-height: 1.42;
}

.chart-legend .upload {
  color: var(--primary, #ff8400);
}

.chart-legend .download {
  color: var(--color-info-foreground, #b2b2ff);
}

.chart-box {
  position: relative;
  flex: 1;
  min-height: 0;
  border: 1px solid var(--border, #2e2e2e);
  border-radius: 6px;
  background: var(--background, #111111);
  padding: 12px 14px;
}

.connection-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
}

.connection-close,
.connection-view {
  display: inline-flex;
  height: 40px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  padding: 10px 16px;
  font-family: var(--pm-font);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.46;
  text-decoration: none;
  cursor: pointer;
}

.connection-close {
  background: var(--secondary, #2e2e2e);
  color: var(--secondary-foreground, #ffffff);
}

.connection-view {
  background: var(--primary, #ff8400);
  color: var(--primary-foreground, #111111);
}

.connection-table {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  overflow: auto;
  overscroll-behavior: contain;
  border: 1px solid var(--border, #2e2e2e);
  border-radius: 6px;
  background: var(--background, #111111);
}

.connection-row {
  display: grid;
  height: 48px;
  grid-template-columns: 80px 100px 180px minmax(0, 1fr) 90px 100px 100px;
  align-items: center;
  border-bottom: 1px solid var(--border, #2e2e2e);
  padding: 0 14px;
  color: var(--foreground, #ffffff);
  column-gap: 0;
}

.connection-header {
  position: sticky;
  top: 0;
  z-index: 2;
  height: 34px;
  background: var(--secondary, #2e2e2e);
}

.connection-virtual-spacer {
  position: relative;
  width: 100%;
  flex: 0 0 auto;
}

.connection-virtual-row {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

.connection-row.muted {
  background: var(--card, #1a1a1a);
}

.connection-row span {
  min-width: 0;
  overflow: hidden;
  font-family: var(--pm-font);
  font-size: 13px;
  line-height: 1.31;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.connection-header span {
  color: var(--muted-foreground, #b8b9b6);
  font-size: 12px;
  line-height: 1.42;
}

.connection-row span:first-child,
.connection-row span:nth-child(6),
.connection-row span:nth-child(7),
.method-cell {
  font-family: "JetBrains Mono", Consolas, monospace;
}

.method-get {
  color: var(--color-success-foreground, #b6ffce) !important;
}

.method-connect,
.method-post,
.method-put,
.method-patch {
  color: var(--color-warning-foreground, #ff8400) !important;
}

.method-delete {
  color: var(--destructive, #ff5c33) !important;
}

.connection-empty {
  display: flex;
  flex: 1;
  min-height: 0;
  align-items: center;
  justify-content: center;
  color: var(--muted-foreground, #b8b9b6);
  font-family: var(--pm-font);
  font-size: 13px;
}

@media (max-width: 1439px) {
  .overview {
    min-height: auto;
    padding: 24px;
  }

  .overview-top {
    height: auto;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .overview-top > * {
    height: 232px;
  }

  .metric-board {
    height: 232px;
  }

  .policy-card,
  .user-card {
    min-height: 232px;
  }

  .overview-main-stack {
    height: auto;
  }

  .traffic-panel {
    height: 320px;
  }

  .connections-panel {
    height: auto;
    min-height: 252px;
  }
}

@media (max-width: 1180px) {
  .overview-top {
    grid-template-columns: 1fr;
  }

  .connection-table {
    overflow-x: auto;
  }

  .connection-row {
    min-width: 1050px;
  }
}

@media (max-width: 760px) {
  .overview {
    padding: 20px;
  }

  .metric-row {
    grid-template-columns: 1fr;
  }

  .metric-board,
  .user-preview-area {
    height: auto;
  }

  .user-preview-area {
    height: auto;
  }
}
</style>
