<template>
  <div class="user-monitoring">
    <!-- 统计信息栏 -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="label">总用户:</span>
        <span class="value">{{ wsStore.userTrafficList.length }}</span>
      </div>
      <div class="stat-item">
        <span class="label">在线:</span>
        <span class="value online">{{ onlineCount }}</span>
      </div>
      <div class="stat-item">
        <span class="label">离线:</span>
        <span class="value offline">{{ wsStore.userTrafficList.length - onlineCount }}</span>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="actions-bar">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索 IP 地址..."
        class="search-input"
      />
      <button
        class="btn-clean-offline"
        :disabled="isCleaning || !wsStore.isConnected || wsStore.userTrafficList.length === 0"
        @click="handleCleanOffline"
      >
        {{ isCleaning ? '清理中...' : '一键清理离线' }}
      </button>
    </div>

    <!-- 表格 -->
    <div class="table-section">
      <div class="scroller" ref="scrollerRef">
        <!-- 吸顶表头 -->
        <div class="grid-row thead-row">
          <div class="th">状态</div>
          <div class="th">IP 地址</div>
          <div class="th">上传流量</div>
          <div class="th">下载流量</div>
          <div class="th">总流量</div>
          <div class="th">操作</div>
        </div>

        <!-- 空数据提示 -->
        <div v-if="flatList.length === 0" class="no-data">
          {{ searchQuery ? '未找到匹配的用户' : '暂无用户流量数据' }}
        </div>

        <!-- 虚拟高度容器 -->
        <div :style="{ position: 'relative', height: totalSize + 'px' }">
          <div
            v-for="row in virtualRows"
            :key="row.key"
            :ref="(el) => { if (el) virtualizer.measureElement(el) }"
            :data-index="row.index"
            :style="{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${row.start}px)`
            }"
          >
            <!-- IP 主行 -->
            <div
              v-if="flatList[row.index].isParent"
              class="grid-row data-row parent-row"
              @click="toggleExpand(flatList[row.index].ip)"
            >
              <div class="td status-cell">
                <span class="status-dot" :class="flatList[row.index].online ? 'online' : 'offline'"></span>
                <span class="status-text">{{ flatList[row.index].online ? '在线' : '离线' }}</span>
              </div>
              <div class="td ip-cell">
                <span class="expand-icon">{{ expandedIPs.has(flatList[row.index].ip) ? '▼' : '▶' }}</span>
                <span>{{ flatList[row.index].ip }}</span>
                <span class="host-count">{{ flatList[row.index].hosts.length }} 个 Host</span>
              </div>
              <div class="td">{{ formatBytes(flatList[row.index].totalUp) }}</div>
              <div class="td">{{ formatBytes(flatList[row.index].totalDown) }}</div>
              <div class="td">{{ formatBytes(flatList[row.index].totalUp + flatList[row.index].totalDown) }}</div>
              <div class="td action-cell">
                <button
                  class="btn-disconnect"
                  @click.stop="handleDisconnect(flatList[row.index].ip)"
                  title="断开该 IP 所有连接"
                >断开</button>
              </div>
            </div>

            <!-- Host 子行 -->
            <div
              v-else
              class="grid-row data-row child-row"
            >
              <div class="td"></div>
              <div class="td host-name">{{ flatList[row.index].host }}</div>
              <div class="td">{{ formatBytes(flatList[row.index].up) }}</div>
              <div class="td">{{ formatBytes(flatList[row.index].down) }}</div>
              <div class="td">{{ formatBytes(flatList[row.index].up + flatList[row.index].down) }}</div>
              <div class="td"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { useWebSocketStore } from '@/stores/websocket'

const wsStore = useWebSocketStore()
const searchQuery = ref('')
const expandedIPs = ref(new Set())
const scrollerRef = ref(null)
const isCleaning = ref(false)
const pendingCleanupRequest = ref(false)

// 在线用户数
const onlineCount = computed(() => {
  return wsStore.userTrafficList.filter(item => item.online).length
})

// 过滤 + 排序（在线优先，同状态按总流量降序）
const filteredList = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  let list = wsStore.userTrafficList
  if (q) list = list.filter(item => item.ip.includes(q))
  return [...list].sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1
    return (b.totalUp + b.totalDown) - (a.totalUp + a.totalDown)
  })
})

// 扁平化：IP 主行 + 展开后的 Host 子行
const flatList = computed(() => {
  const result = []
  filteredList.value.forEach(item => {
    result.push({ ...item, isParent: true, key: `ip-${item.ip}` })
    if (expandedIPs.value.has(item.ip)) {
      // 对 hosts 按总流量降序排序，总流量相同时按 host 名称字典序，避免跳变
      const sortedHosts = [...item.hosts].sort((a, b) => {
        const trafficDiff = (b.up + b.down) - (a.up + a.down)
        if (trafficDiff !== 0) return trafficDiff
        return a.host.localeCompare(b.host)
      })
      sortedHosts.forEach(host => {
        result.push({ ...host, isParent: false, parentIp: item.ip, key: `host-${item.ip}-${host.host}` })
      })
    }
  })
  return result
})

// 虚拟滚动
const virtualizer = useVirtualizer(
  computed(() => ({
    count: flatList.value.length,
    getScrollElement: () => scrollerRef.value,
    estimateSize: () => 48,
    overscan: 10,
    getItemKey: (index) => flatList.value[index].key,
  }))
)

const virtualRows = computed(() => virtualizer.value.getVirtualItems())
const totalSize = computed(() => virtualizer.value.getTotalSize())

// 展开/收起
function toggleExpand(ip) {
  const set = expandedIPs.value
  if (set.has(ip)) { set.delete(ip) } else { set.add(ip) }
  expandedIPs.value = new Set(set)
}

// 一键清理离线用户
function handleCleanOffline() {
  isCleaning.value = true
  pendingCleanupRequest.value = true
  wsStore.cleanOfflineUsers()
}

// 收到 user_traffic 更新后恢复按钮状态
watch(() => wsStore.userTrafficList, () => {
  if (pendingCleanupRequest.value) {
    isCleaning.value = false
    pendingCleanupRequest.value = false
  }
})

// 断开连接
function handleDisconnect(ip) {
  if (confirm(`确定要断开 IP ${ip} 的所有连接吗？`)) {
    wsStore.closeUserConnections(ip)
  }
}

// 格式化字节数
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

// 生命周期
onMounted(() => wsStore.subscribeUserTraffic())
onUnmounted(() => wsStore.unsubscribeUserTraffic())
</script>

<style scoped>
.user-monitoring {
  height: 100%;
  display: flex;
  flex-direction: column;
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

.stat-item .value.online {
  color: #28a745;
}

.stat-item .value.offline {
  color: #6c757d;
}

/* 操作栏 */
.actions-bar {
  display: flex;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  max-width: 400px;
  padding: 10px 15px;
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  color: #cba376;
  font-size: 0.95em;
  outline: none;
  transition: border-color 0.3s;
}

.search-input:focus {
  border-color: #cba376;
}

.search-input::placeholder {
  color: #666;
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
}

/* Grid 行布局 */
.grid-row {
  display: grid;
  grid-template-columns: 100px 1.5fr 1fr 1fr 1fr 100px;
  align-items: center;
  color: #cba376;
}

/* 虚拟滚动容器 */
.scroller {
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

/* 数据行 */
.td {
  padding: 10px 12px;
  border-bottom: 1px solid #3a3a3a;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.no-data {
  text-align: center;
  color: #999;
  padding: 40px;
}

/* 父行样式 */
.parent-row {
  background: #2a2a2a;
  cursor: pointer;
}

.parent-row:hover .td {
  background: #333;
}

/* 子行样式 */
.child-row .td {
  background: #222;
  padding-left: 16px;
}

.child-row:hover .td {
  background: #2d2d2d;
}

.host-name {
  padding-left: 40px !important;
  color: #999;
}

/* 在线状态 */
.status-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.online {
  background-color: #28a745;
  box-shadow: 0 0 6px rgba(40, 167, 69, 0.5);
}

.status-dot.offline {
  background-color: #dc3545;
}

.status-text {
  font-size: 0.85em;
  color: #999;
}

/* IP 单元格 */
.ip-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.expand-icon {
  display: inline-block;
  width: 16px;
  color: #cba376;
  user-select: none;
  font-size: 0.8em;
}

.host-count {
  color: #666;
  font-size: 0.8em;
  margin-left: 8px;
}

/* 操作按钮 */
.action-cell {
  display: flex;
  justify-content: center;
}

.btn-disconnect {
  background: transparent;
  color: #dc3545;
  border: 1px solid #dc3545;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8em;
  transition: all 0.2s;
}

.btn-disconnect:hover {
  background: rgba(220, 53, 69, 0.2);
  color: #ff4d4d;
}

.btn-clean-offline {
  background: transparent;
  color: #cba376;
  border: 1px solid #cba376;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.2s;
  margin-left: 12px;
  white-space: nowrap;
}
.btn-clean-offline:hover:not(:disabled) {
  background: rgba(203, 163, 118, 0.2);
}
.btn-clean-offline:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 滚动条样式 */
.scroller::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.scroller::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.scroller::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 4px;
}

.scroller::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
