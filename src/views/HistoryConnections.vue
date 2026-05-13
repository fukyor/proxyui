<template>
  <div class="connections history">
    <header class="pm-page-head connections-head">
      <div class="pm-head-copy">
        <h1>历史连接</h1>
        <p class="pm-page-subtitle">已关闭连接归档，便于追溯 Host、URL、协议与流量。</p>
      </div>
      <div class="history-total">
        <span>已归档连接</span>
        <strong>{{ filteredHistoryConnections.length }}</strong>
      </div>
    </header>

    <!-- 统计信息栏 -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="label">已归档历史连接</span>
        <span class="value closed">{{ filteredHistoryConnections.length }}</span>
      </div>
    </div>

    <!-- 搜索和操作栏 -->
    <div class="actions-bar">
      <div class="quick-filters">
        <label class="quick-filter-field id-filter">
          <Hash :size="16" />
          <input
            v-model="columnFilters.id"
            type="text"
            class="quick-filter-input"
            placeholder="搜索 ID，例如 553"
          />
          <button
            v-if="hasColumnFilter('id')"
            type="button"
            class="quick-filter-clear"
            title="清除 ID 搜索"
            @click="clearColumnFilter('id')"
          >
            <X :size="14" />
          </button>
        </label>
        <label class="quick-filter-field host-filter">
          <Server :size="16" />
          <input
            v-model="columnFilters.host"
            type="text"
            class="quick-filter-input"
            placeholder="搜索 Host，例如 google.com"
          />
          <button
            v-if="hasColumnFilter('host')"
            type="button"
            class="quick-filter-clear"
            title="清除 Host 搜索"
            @click="clearColumnFilter('host')"
          >
            <X :size="14" />
          </button>
        </label>
        <label class="quick-filter-field url-filter">
          <LinkIcon :size="16" />
          <input
            v-model="columnFilters.url"
            type="text"
            class="quick-filter-input"
            placeholder="搜索 URL，例如 /session_svr"
          />
          <button
            v-if="hasColumnFilter('url')"
            type="button"
            class="quick-filter-clear"
            title="清除 URL 搜索"
            @click="clearColumnFilter('url')"
          >
            <X :size="14" />
          </button>
        </label>
      </div>
      <button @click="handleClearHistory" class="btn-clear-history">清空历史</button>
    </div>

    <!-- 连接表格 -->
    <div class="table-section">
      <div class="conn-scroller" ref="historyScrollerRef">
        <!-- sticky 吸顶表头 -->
        <div class="conn-grid-row thead-row">
          <div class="th">ID</div>
          <div
            class="th method-filterable"
            :class="{ active: methodMenuOpen, 'has-filter': hasColumnFilter('method') }"
            @click.stop="toggleMethodMenu"
          >
            <span>方法</span>
            <span class="method-filter-label">{{ methodFilterLabel }}</span>
            <ChevronUp v-if="methodMenuOpen" :size="14" />
            <ChevronDown v-else :size="14" />

            <div v-if="methodMenuOpen" class="method-filter-menu" @click.stop>
              <button
                v-for="option in connectionMethodOptions"
                :key="option.value || 'all'"
                type="button"
                class="method-filter-option"
                :class="{ active: columnFilters.method === option.value }"
                @click.stop="selectMethodFilter(option.value)"
              >
                <Check v-if="columnFilters.method === option.value" :size="14" />
                <span v-else class="method-check-placeholder"></span>
                {{ option.label }}
              </button>
            </div>
          </div>
          <div class="th">Host</div>
          <div class="th">URL</div>
          <div class="th">协议</div>
          <div class="th">上传</div>
          <div class="th">下载</div>
        </div>

        <!-- 空数据提示 -->
        <div v-if="filteredHistoryConnections.length === 0" class="no-data">
          {{ hasActiveColumnFilters ? '未找到匹配的历史连接' : '暂无历史记录' }}
        </div>

        <!-- 虚拟高度容器 -->
        <div :style="{ position: 'relative', height: historyTotalSize + 'px' }">
          <div
            v-for="virtualRow in historyVirtualRows"
            :key="virtualRow.key"
            :data-index="virtualRow.index"
            :style="{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`
            }"
          >
            <div class="conn-grid-row data-row history-row">
              <div class="td">{{ filteredHistoryConnections[virtualRow.index].id }}</div>
              <div class="td">
                <span class="badge method-badge" :class="getMethodClass(filteredHistoryConnections[virtualRow.index].method)">
                  {{ filteredHistoryConnections[virtualRow.index].method }}
                </span>
              </div>
              <div class="td">{{ filteredHistoryConnections[virtualRow.index].host }}</div>
              <div class="td url-cell" :title="filteredHistoryConnections[virtualRow.index].url">
                {{ filteredHistoryConnections[virtualRow.index].url }}
              </div>
              <div class="td">
                <span class="badge protocol-badge" :class="getProtocolClass(filteredHistoryConnections[virtualRow.index].protocol)">
                  {{ filteredHistoryConnections[virtualRow.index].protocol }}
                </span>
              </div>
              <div class="td">{{ formatBytes(filteredHistoryConnections[virtualRow.index].up || 0) }}</div>
              <div class="td">{{ formatBytes(filteredHistoryConnections[virtualRow.index].down || 0) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { Check, ChevronDown, ChevronUp, Hash, Link as LinkIcon, Server, X } from 'lucide-vue-next'
import { useWebSocketStore } from '@/stores/websocket'

const wsStore = useWebSocketStore()

// 响应式数据
const flatHistoryConnections = ref([])
const historyScrollerRef = ref(null)
const methodMenuOpen = ref(false)
const columnFilters = ref({
  id: '',
  method: '',
  host: '',
  url: ''
})

const filterFields = ['id', 'method', 'host', 'url']
const connectionMethodOptions = [
  { value: '', label: '全部方法' },
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'HEAD', label: 'HEAD' },
  { value: 'OPTIONS', label: 'OPTIONS' },
  { value: 'CONNECT', label: 'CONNECT' },
  { value: 'TUNNEL', label: 'TUNNEL' },
  { value: 'Tcp-Keep-Alive', label: 'Tcp-Keep-Alive' }
]

let unsubscribeHistory = null

function hasColumnFilter(field) {
  return Boolean(columnFilters.value[field]?.trim())
}

function clearColumnFilter(field) {
  columnFilters.value[field] = ''
}

function toggleMethodMenu() {
  methodMenuOpen.value = !methodMenuOpen.value
}

function selectMethodFilter(method) {
  columnFilters.value.method = method
  methodMenuOpen.value = false
}

const methodFilterLabel = computed(() => columnFilters.value.method || '全部')

const hasActiveColumnFilters = computed(() => {
  return filterFields.some(field => hasColumnFilter(field))
})

function normalizeFilterValue(value) {
  return String(value ?? '').toLowerCase()
}

function connectionMatchesFilters(conn) {
  return filterFields.every(field => {
    const query = columnFilters.value[field]?.trim().toLowerCase()
    if (!query) return true
    if (field === 'method') {
      return normalizeFilterValue(conn.method) === query
    }
    return normalizeFilterValue(conn[field]).includes(query)
  })
}

// 历史记录虚拟滚动器（仅过滤不展开子节点）
const filteredHistoryConnections = computed(() => {
  let result = flatHistoryConnections.value
  if (hasActiveColumnFilters.value) {
    result = result.filter(conn => connectionMatchesFilters(conn))
  }
  return result
})

const historyVirtualizer = useVirtualizer(
  computed(() => ({
    count: filteredHistoryConnections.value.length,
    getScrollElement: () => historyScrollerRef.value,
    estimateSize: () => 45,
    overscan: 20,
    getItemKey: (index) => 'h-' + filteredHistoryConnections.value[index].id,
  }))
)

const historyVirtualRows = computed(() => historyVirtualizer.value.getVirtualItems())
const historyTotalSize = computed(() => historyVirtualizer.value.getTotalSize())

// 更新连接列表
function updateHistoryConnections(data) {
  flatHistoryConnections.value = data
}

// 清除所有历史
function handleClearHistory() {
  wsStore.clearHistoryConnections()
}

// 格式化字节数
function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.max(0, Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1))
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

// 获取方法样式类
function getMethodClass(method) {
  const methodMap = {
    'GET': 'method-get',
    'POST': 'method-post',
    'PUT': 'method-put',
    'DELETE': 'method-delete',
    'PATCH': 'method-patch',
    'HEAD': 'method-head',
    'OPTIONS': 'method-options',
    'CONNECT': 'method-connect',
    'TUNNEL': 'method-connect',
    'Tcp-Keep-Alive': 'method-connect'
  }
  return methodMap[method] || 'method-default'
}

// 获取协议样式类
function getProtocolClass(protocol) {
  const protocolMap = {
    'HTTP': 'protocol-http',
    'HTTPS': 'protocol-https',
    'HTTPS-MITM': 'protocol-mitm',
    'HTTPS-Tunnel': 'protocol-tunnel',
    'HTTP-MITM': 'protocol-mitm'
  }
  return protocolMap[protocol] || 'protocol-default'
}

// 生命周期钩子
onMounted(() => {
  unsubscribeHistory = wsStore.subscribeHistoryConnections((data) => {
    updateHistoryConnections(data)
  })

  // 初始化数据（从 store 缓存读取）
  updateHistoryConnections(wsStore.historyConnections)
})

onUnmounted(() => {
  if (unsubscribeHistory) unsubscribeHistory()
})
</script>

<style scoped>
.connections {
  padding: 20px;
  height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
}

h1 {
  color: #cba376;
  margin-bottom: 20px;
  flex-shrink: 0;
}

/* 统计信息栏 */
.stats-bar {
  display: flex;
  gap: 30px;
  background: #2a2a2a;
  border-radius: 8px;
  padding: 15px 20px;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-item .label {
  color: #999;
  font-size: 0.9em;
}

.stat-item .value {
  color: #cba376;
  font-size: 1.1em;
  font-weight: bold;
}

.stat-item .value.closed {
  color: #6c757d;
}

/* 操作栏 */
.actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 15px;
  flex-shrink: 0;
}

.quick-filters {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  width: min(920px, 100%);
}

.quick-filter-field {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  min-width: 0;
  padding: 0 12px;
  border: 1px solid var(--pm-border);
  border-radius: 999px;
  background: var(--pm-bg);
  color: var(--pm-primary);
}

.quick-filter-field.id-filter {
  flex: 0 0 170px;
}

.quick-filter-field.host-filter {
  flex: 0 0 280px;
}

.quick-filter-field.url-filter {
  flex: 1 1 320px;
}

.quick-filter-input {
  min-width: 0;
  min-height: auto !important;
  flex: 1;
  border: 0 !important;
  border-radius: 0 !important;
  outline: none;
  background: transparent !important;
  color: var(--pm-text);
  font: inherit;
  font-size: 13px;
  padding: 0 !important;
  box-shadow: none !important;
}

.quick-filter-input:focus {
  border: 0 !important;
  box-shadow: none !important;
}

.quick-filter-input::placeholder {
  color: var(--pm-muted);
}

.quick-filter-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--pm-muted);
  cursor: pointer;
}

.quick-filter-clear:hover {
  background: rgba(255, 132, 0, 0.14);
  color: var(--pm-primary);
}

.btn-clear-history {
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95em;
  transition: background 0.3s;
  white-space: nowrap;
}

.btn-clear-history:hover {
  background: #5a6268;
}

/* 表格部分 */
.table-section {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #2a2a2a;
  border-radius: 8px;
  padding: 0;
}

/* CSS Grid 行布局 */
.conn-grid-row {
  display: grid;
  grid-template-columns: minmax(80px, 0.8fr) minmax(60px, 0.8fr) minmax(100px, 1.5fr) minmax(150px, 3fr) minmax(80px, 1fr) minmax(60px, 0.8fr) minmax(60px, 0.8fr);
  align-items: flex-start;
  color: #cba376;
}

/* 虚拟滚动容器 */
.conn-scroller {
  flex: 1;
  overflow: auto;
  overscroll-behavior: contain;
  min-height: 0;
}

/* 表头行 */
.thead-row {
  background: #1a1a1a;
  border-bottom: 2px solid #cba376;
  position: sticky;
  top: 0;
  z-index: 10;
}

.th {
  padding: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.method-filterable {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
  overflow: visible !important;
}

.method-filterable:hover {
  background: #252525;
}

.method-filterable.active,
.method-filterable.has-filter {
  color: var(--pm-primary);
}

.method-filter-label {
  font-size: 12px;
  color: currentColor;
}

.method-filter-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 10px;
  z-index: 50;
  width: 230px;
  padding: 8px;
  border: 1px solid var(--pm-primary);
  border-radius: 8px;
  background: var(--pm-surface);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
}

.method-filter-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--pm-text);
  font-family: var(--pm-mono);
  font-size: 12px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.method-filter-option:hover {
  background: rgba(255, 132, 0, 0.14);
  color: var(--pm-primary);
}

.method-filter-option.active {
  background: rgba(255, 132, 0, 0.16);
  color: var(--pm-primary);
}

.method-check-placeholder {
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
}

/* 数据单元格 */
.td {
  padding: 10px 12px;
  border-bottom: 1px solid #3a3a3a;
  overflow: hidden;
  white-space: normal;
  word-break: break-all;
}

.url-cell {
  overflow: hidden;
  white-space: normal;
  word-break: break-all;
}

.no-data {
  text-align: center;
  color: #999;
  padding: 40px;
}

.history-row {
  opacity: 0.85;
  transition: opacity 0.2s;
}

.history-row:hover {
  opacity: 1;
}

.data-row:hover .td {
  background: #333;
}

/* 徽章样式 */
.badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.85em;
  font-weight: 600;
  text-transform: uppercase;
}

.method-badge {
  min-width: 60px;
  text-align: center;
}

.method-get { background: rgba(40, 167, 69, 0.2); color: #28a745; }
.method-post { background: rgba(0, 123, 255, 0.2); color: #007bff; }
.method-put { background: rgba(255, 193, 7, 0.2); color: #ffc107; }
.method-delete { background: rgba(220, 53, 69, 0.2); color: #dc3545; }
.method-patch { background: rgba(108, 117, 125, 0.2); color: #6c757d; }
.method-head { background: rgba(111, 66, 193, 0.2); color: #6f42c1; }
.method-options { background: rgba(23, 162, 184, 0.2); color: #17a2b8; }
.method-connect { background: rgba(203, 163, 118, 0.2); color: #cba376; }
.method-default { background: rgba(108, 117, 125, 0.2); color: #6c757d; }

.protocol-badge {
  min-width: 80px;
  text-align: center;
}

.protocol-http { background: rgba(0, 123, 255, 0.2); color: #007bff; }
.protocol-https { background: rgba(40, 167, 69, 0.2); color: #28a745; }
.protocol-mitm { background: rgba(255, 193, 7, 0.2); color: #ffc107; }
.protocol-tunnel { background: rgba(108, 117, 125, 0.2); color: #6c757d; }
.protocol-default { background: rgba(108, 117, 125, 0.2); color: #6c757d; }

/* 滚动条样式 */
.conn-scroller::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.conn-scroller::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.conn-scroller::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 4px;
}

.conn-scroller::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.connections {
  gap: 20px;
  padding: 28px 32px;
  background: var(--pm-bg);
}

.connections-head {
  flex-shrink: 0;
}

.history-total {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  color: var(--pm-muted);
}

.history-total strong {
  color: var(--pm-text);
  font-family: var(--pm-mono);
  font-size: 26px;
}

.stats-bar {
  display: none;
}

.actions-bar {
  margin-bottom: 0;
}

.table-section {
  border: 1px solid var(--pm-border);
  background: var(--pm-surface);
}

.conn-scroller {
  background: #111111;
}

.conn-grid-row {
  min-width: 900px;
  grid-template-columns: 90px 110px minmax(150px, 1.4fr) minmax(220px, 2.2fr) 120px 100px 100px;
  color: var(--pm-text);
}

.thead-row {
  background: #2b2b2b;
  border-bottom: 0;
  overflow: visible;
  z-index: 30;
}

.th,
.td {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.url-cell {
  white-space: nowrap;
}

@media (max-width: 760px) {
  .connections {
    padding: 20px;
  }

  .history-total {
    align-items: flex-start;
  }
}
</style>
