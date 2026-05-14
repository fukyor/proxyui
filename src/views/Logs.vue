<template>
  <div class="logs">
    <header class="pm-page-head logs-head">
      <div class="pm-head-copy">
        <h1>日志</h1>
        <p class="pm-page-subtitle">代理运行日志，支持按级别订阅和自动滚动。</p>
      </div>
    </header>

    <!-- 控制栏 -->
    <div class="controls">
      <div class="filter-controls">
        <div class="filter-group">
          <label for="logLevel">日志级别</label>
          <select id="logLevel" v-model="selectedLevel" @change="handleLevelChange">
            <option value="DEBUG">DEBUG</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
          </select>
        </div>

        <div class="filter-group">
          <label for="logCategory">日志分类</label>
          <select id="logCategory" v-model="selectedCategory">
            <option
              v-for="option in categoryOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>

        <div class="filter-group message-filter">
          <label for="messageSearch">message 搜索</label>
          <input
            id="messageSearch"
            v-model="messageSearch"
            class="message-search"
            type="search"
            placeholder="message 正则"
            spellcheck="false"
          >
          <span v-if="messageSearchState.error" class="search-error">
            {{ messageSearchState.error }}
          </span>
        </div>
      </div>

      <div class="button-group">
        <button @click="handleClearLogs" class="btn-clear">清除日志</button>
        <button @click="toggleAutoScroll" class="btn-scroll">
          {{ autoScroll ? '禁用自动滚动' : '启用自动滚动' }}
        </button>
      </div>
    </div>

    <!-- 日志列表 -->
    <div class="logs-outer">
      <div v-if="filteredLogs.length === 0" class="no-logs">
        暂无日志
      </div>
      <div class="logs-scroller" ref="scrollerRef">
        <div
          :style="{ position: 'relative', height: totalSize + 'px' }"
        >
          <div
            v-for="virtualRow in virtualRows"
            :key="virtualRow.key"
            :style="{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`
            }"
          >
            <div
              v-if="filteredLogs[virtualRow.index]"
              :class="['log-entry', `log-${filteredLogs[virtualRow.index].level.toLowerCase()}`]"
            >
              <span class="log-time">{{ formatTime(filteredLogs[virtualRow.index].time) }}</span>
              <span class="log-level">{{ filteredLogs[virtualRow.index].level }}</span>
              <span class="log-session">{{ filteredLogs[virtualRow.index].session > 0 ? `[${filteredLogs[virtualRow.index].session}]` : '' }}</span>
              <span class="log-message">{{ filteredLogs[virtualRow.index].message }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { useWebSocketStore } from '@/stores/websocket'

const wsStore = useWebSocketStore()

// 响应式数据
const selectedLevel = ref('INFO')
const selectedCategory = ref('focus')
const messageSearch = ref('')
const autoScroll = ref(true)
const scrollerRef = ref(null)

let unsubscribeLogs = null

// 日志级别权重（用于过滤）
const logLevels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 }
const focusCategories = new Set(['route', 'access'])
const categoryOptions = [
  { value: 'focus', label: '用户关注' },
  { value: 'all', label: '全部' },
  { value: 'route', label: '路由匹配' },
  { value: 'access', label: '访问控制' },
  { value: 'traffic', label: '流量统计' },
  { value: 'request', label: '请求响应' },
  { value: 'websocket', label: 'WebSocket' },
  { value: 'mitm', label: 'MITM/TLS' },
  { value: 'network', label: '网络错误' },
  { value: 'system', label: '系统' },
  { value: 'general', label: '通用' },
]

// message 搜索状态，正则无效时不参与过滤
const messageSearchState = computed(() => {
  const pattern = messageSearch.value.trim()
  if (!pattern) {
    return { regex: null, error: '' }
  }

  try {
    return { regex: new RegExp(pattern, 'i'), error: '' }
  } catch {
    return { regex: null, error: '正则无效，已暂不应用搜索' }
  }
})

// 计算过滤后的日志
const filteredLogs = computed(() => {
  const minLevel = logLevels[selectedLevel.value] ?? logLevels.INFO
  const category = selectedCategory.value
  const messageRegex = messageSearchState.value.regex

  let result = wsStore.logs.filter(log => {
    const logLevel = logLevels[log.level] ?? logLevels.INFO
    return logLevel >= minLevel
  })

  result = result.filter(log => {
    const logCategory = log.category || 'general'
    if (category === 'all') return true
    if (category === 'focus') return focusCategories.has(logCategory)
    return logCategory === category
  })

  if (!messageRegex) {
    return result
  }

  return result.filter(log => messageRegex.test(String(log.message || '')))
})

// 虚拟滚动器
const virtualizer = useVirtualizer(
  computed(() => ({
    count: filteredLogs.value.length,
    getScrollElement: () => scrollerRef.value,
    estimateSize: () => 40,
    overscan: 20,
    getItemKey: (index) => filteredLogs.value[index]?.id ?? index,
  }))
)

const virtualRows = computed(() => virtualizer.value.getVirtualItems())
const totalSize = computed(() => virtualizer.value.getTotalSize())

// 处理级别变化
function handleLevelChange() {
  wsStore.updateSubscriptions({ logLevel: selectedLevel.value })
}

// 清除日志
function handleClearLogs() {
  wsStore.clearLogs()
}

// 切换自动滚动
function toggleAutoScroll() {
  autoScroll.value = !autoScroll.value
  if (autoScroll.value) {
    scrollToBottom()
  }
}

// 滚动到底部
function scrollToBottom() {
  if (!autoScroll.value) return
  const len = filteredLogs.value.length
  if (len === 0) return
  nextTick(() => {
    virtualizer.value.scrollToIndex(len - 1, { align: 'end' })
  })
}

// 格式化时间
function formatTime(time) {
  if (!time) return ''
  const date = new Date(time)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

// 生命周期钩子
onMounted(() => {
  unsubscribeLogs = wsStore.subscribeLogs(() => {
    scrollToBottom()
  })
  selectedLevel.value = wsStore.subscriptions.logLevel
})

onUnmounted(() => {
  if (unsubscribeLogs) unsubscribeLogs()
})

watch([selectedLevel, selectedCategory, messageSearch], () => {
  scrollToBottom()
})
</script>

<style scoped>
.logs {
  padding: 20px;
  height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
}

h1 {
  color: #cba376;
  margin-bottom: 20px;
}

/* 控制栏 */
.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  background: #2a2a2a;
  padding: 15px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.filter-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 18px;
  min-width: 0;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-group label {
  color: #cba376;
  font-weight: 500;
}

.filter-group select,
.message-search {
  padding: 6px 12px;
  background: #1a1a1a;
  color: #cba376;
  border: 1px solid #444;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.message-filter {
  position: relative;
}

.message-search {
  width: min(320px, 38vw);
  min-width: 180px;
  cursor: text;
}

.filter-group select:focus,
.message-search:focus {
  outline: none;
  border-color: #cba376;
}

.search-error {
  color: #f0ad4e;
  font-size: 0.85em;
  white-space: nowrap;
}

.button-group {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.btn-clear,
.btn-scroll {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background 0.3s;
}

.btn-clear {
  background: #d9534f;
  color: white;
}

.btn-clear:hover {
  background: #c9302c;
}

.btn-scroll {
  background: #5bc0de;
  color: white;
}

.btn-scroll:hover {
  background: #46b8da;
}

/* 外层容器：隐藏溢出，flex 伸展 */
.logs-outer {
  flex: 1;
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

/* 虚拟滚动容器 */
.logs-scroller {
  height: 100%;
  overflow-y: auto;
  padding: 15px;
  box-sizing: border-box;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.9em;
}

.no-logs {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #999;
  padding: 40px;
}

/* 日志条目 */
.log-entry {
  padding: 6px 0;
  border-bottom: 1px solid #2a2a2a;
  display: flex;
  gap: 10px;
  box-sizing: border-box;
  height: 34px;
  align-items: center;
  overflow: hidden;
}

.log-entry:hover {
  background: #252525;
}

.log-time {
  color: #888;
  min-width: 100px;
  flex-shrink: 0;
}

.log-level {
  font-weight: bold;
  min-width: 60px;
  flex-shrink: 0;
}

.log-session {
  color: #5bc0de;
  min-width: 50px;
  flex-shrink: 0;
}

.log-message {
  color: #cba376;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 不同级别的颜色 */
.log-debug .log-level {
  color: #888;
}

.log-info .log-level {
  color: #5bc0de;
}

.log-warn .log-level {
  color: #f0ad4e;
}

.log-error .log-level {
  color: #d9534f;
}

/* 滚动条样式 */
.logs-scroller::-webkit-scrollbar {
  width: 8px;
}

.logs-scroller::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.logs-scroller::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 4px;
}

.logs-scroller::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.logs {
  gap: 20px;
  padding: 28px 32px;
  background: var(--pm-bg);
}

.logs-head {
  flex-shrink: 0;
}

.controls {
  margin-bottom: 0;
}

.filter-group select {
  min-width: 120px;
}

.logs-outer {
  border: 1px solid var(--pm-border);
  background: var(--pm-surface);
}

.logs-scroller {
  background: #111111;
  padding: 0;
}

.log-entry {
  display: grid;
  grid-template-columns: 120px 80px 90px minmax(0, 1fr);
  gap: 12px;
  height: 40px;
  padding: 0 16px;
}

.log-time,
.log-level,
.log-session,
.log-message {
  min-width: 0;
}

.log-message {
  color: var(--pm-text);
}

@media (max-width: 760px) {
  .logs {
    padding: 20px;
  }

  .controls {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-controls,
  .filter-group,
  .button-group {
    width: 100%;
  }

  .filter-group {
    align-items: flex-start;
    flex-direction: column;
  }

  .filter-group select,
  .message-search {
    width: 100%;
  }

  .log-entry {
    grid-template-columns: 80px 64px minmax(0, 1fr);
  }

  .log-session {
    display: none;
  }
}
</style>
