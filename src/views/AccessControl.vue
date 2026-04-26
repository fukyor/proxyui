<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useWebSocketStore } from '@/stores/websocket.js'

const wsStore = useWebSocketStore()

const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

// 本地配置副本
const localConfig = ref({
  AccessEnable: false,
  AccessRules: [],
  UserBlockRules: []
})

const originalConfigStr = ref('')

const hasChanges = computed(() => {
  if (!originalConfigStr.value) return false
  return JSON.stringify(localConfig.value) !== originalConfigStr.value
})

// 新规则输入
const newRule = ref({ Type: 'DomainSuffix', Value: '', Enable: true, Remarks: '' })
const newUserBlockRule = ref({ Value: '', Enable: true, Remarks: '' })

const ruleTypes = [
  { value: 'DomainSuffix', label: '域名后缀' },
  { value: 'DomainKeyword', label: '域名关键词' },
  { value: 'IP', label: 'IP 精确' }
]

const ruleValuePlaceholder = computed(() => {
  switch (newRule.value.Type) {
    case 'DomainSuffix': return 'eg. example.com, twitter.com'
    case 'DomainKeyword': return 'eg. ^baidu\\.com$, \\.cn$'
    case 'IP': return 'eg. 1.2.3.4, 10.0.0.1'
    default: return '规则值'
  }
})

const nextRuleId = computed(() => {
  const ids = localConfig.value.AccessRules.map(r => r.Id)
  return ids.length > 0 ? Math.max(...ids) + 1 : 1
})

const nextUserBlockId = computed(() => {
  const ids = localConfig.value.UserBlockRules.map(r => r.Id)
  return ids.length > 0 ? Math.max(...ids) + 1 : 1
})

function cloneRules(list = []) {
  return list.map(rule => ({ ...rule }))
}

function showAutoReplaceHint() {
  errorMsg.value = '检测到中文逗号 "，"，已自动替换为英文逗号'
  setTimeout(() => {
    if (errorMsg.value === '检测到中文逗号 "，"，已自动替换为英文逗号') {
      errorMsg.value = ''
    }
  }, 3000)
}

function setupCommaNormalization(ruleRef) {
  watch(() => ruleRef.value.Value, (newVal) => {
    if (newVal && newVal.includes('，')) {
      showAutoReplaceHint()
      ruleRef.value.Value = newVal.replace(/，/g, ',')
    }
  })
}

setupCommaNormalization(newRule)
setupCommaNormalization(newUserBlockRule)

onMounted(async () => {
  await loadConfig()
  wsStore.subscribeInterceptLogs()
})

onUnmounted(() => {
  wsStore.unsubscribeInterceptLogs()
})

async function loadConfig() {
  loading.value = true
  errorMsg.value = ''
  try {
    const cfg = await wsStore.loadConfig()
    localConfig.value = {
      AccessEnable: cfg.AccessEnable ?? false,
      AccessRules: cloneRules(cfg.AccessRules ?? []),
      UserBlockRules: cloneRules(cfg.UserBlockRules ?? [])
    }
    originalConfigStr.value = JSON.stringify(localConfig.value)
  } catch (e) {
    errorMsg.value = `加载配置失败: ${e.message}`
  } finally {
    loading.value = false
  }
}

async function saveConfig() {
  saving.value = true
  errorMsg.value = ''
  successMsg.value = ''
  try {
    const current = wsStore.config ?? {}
    const merged = {
      ...current,
      AccessEnable: localConfig.value.AccessEnable,
      AccessRules: cloneRules(localConfig.value.AccessRules),
      UserBlockRules: cloneRules(localConfig.value.UserBlockRules)
    }
    await wsStore.saveConfig(merged)
    originalConfigStr.value = JSON.stringify(localConfig.value)
    successMsg.value = '配置已保存'
    setTimeout(() => { successMsg.value = '' }, 3000)
  } catch (e) {
    errorMsg.value = `保存失败: ${e.message}`
  } finally {
    saving.value = false
  }
}

function addRule() {
  if (!newRule.value.Value.trim()) return
  const cleanValue = newRule.value.Value.split(',').map(v => v.trim()).filter(Boolean).join(',')
  localConfig.value.AccessRules.push({
    Id: nextRuleId.value,
    ...newRule.value,
    Value: cleanValue
  })
  newRule.value = { Type: 'DomainSuffix', Value: '', Enable: true, Remarks: '' }
}

function removeRule(index) {
  localConfig.value.AccessRules.splice(index, 1)
}

function addUserBlock() {
  if (!newUserBlockRule.value.Value.trim()) return
  const cleanValue = newUserBlockRule.value.Value.split(',').map(v => v.trim()).filter(Boolean).join(',')
  localConfig.value.UserBlockRules.push({
    Id: nextUserBlockId.value,
    ...newUserBlockRule.value,
    Value: cleanValue
  })
  newUserBlockRule.value = { Value: '', Enable: true, Remarks: '' }
}

function removeUserBlock(index) {
  localConfig.value.UserBlockRules.splice(index, 1)
}

function getRuleTypeLabel(type) {
  return ruleTypes.find(t => t.value === type)?.label || type
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const d = new Date(timeStr)
  return d.toLocaleTimeString('zh-CN', { hour12: false })
}
</script>

<template>
  <div class="access-control">
    <!-- 页面头部操作按钮 -->
    <div class="page-actions">
      <button class="btn btn-secondary" @click="loadConfig" :disabled="loading">
        {{ loading ? '加载中...' : '刷新' }}
      </button>
      <div class="save-btn-container">
        <button class="btn btn-primary" @click="saveConfig" :disabled="saving">
          {{ saving ? '保存中...' : '保存配置' }}
        </button>
        <span v-if="hasChanges" class="badge-dot"></span>
      </div>
    </div>

    <div v-if="errorMsg" class="alert alert-error">{{ errorMsg }}</div>
    <div v-if="successMsg" class="alert alert-success">{{ successMsg }}</div>

    <!-- 全局设置 + 统计 -->
    <div class="section">
      <h3>全局设置</h3>
      <label class="toggle-label">
        <span>启用访问控制</span>
        <div class="switch">
          <input type="checkbox" v-model="localConfig.AccessEnable" />
          <span class="slider"></span>
        </div>
        <span class="toggle-text">{{ localConfig.AccessEnable ? '已启用' : '已禁用' }}</span>
      </label>
      <p class="hint">启用后,匹配规则的请求将被拦截并返回 403 响应。</p>
    </div>

    <!-- 访问控制规则 -->
    <div class="section">
      <h3>拦截规则</h3>
      <p class="hint">匹配以下任意规则的请求将被拦截（HTTP + HTTPS CONNECT 均生效）。</p>

      <table class="data-table" v-if="localConfig.AccessRules.length > 0">
        <thead>
          <tr>
            <th>启用</th>
            <th>类型</th>
            <th>值</th>
            <th>备注</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(rule, i) in localConfig.AccessRules" :key="rule.Id">
            <td><input type="checkbox" v-model="rule.Enable" /></td>
            <td>{{ getRuleTypeLabel(rule.Type) }}</td>
            <td class="value-cell">{{ rule.Value }}</td>
            <td>{{ rule.Remarks }}</td>
            <td><button class="btn btn-danger-sm" @click="removeRule(i)">删除</button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-hint">暂无拦截规则</p>

      <!-- 添加规则 -->
      <div class="add-row">
        <select v-model="newRule.Type" class="input input-select">
          <option v-for="t in ruleTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
        <input v-model="newRule.Value" :placeholder="ruleValuePlaceholder" class="input flex-fill" spellcheck="false" />
        <input v-model="newRule.Remarks" placeholder="备注（可选）" class="input" />
        <label class="checkbox-label">
          <input type="checkbox" v-model="newRule.Enable" />
          <span>启用</span>
        </label>
        <button class="btn btn-add" @click="addRule">添加规则</button>
      </div>
    </div>

    <!-- 来源 IP 用户拦截 -->
    <div class="section">
      <h3>用户拦截</h3>
      <p class="hint">按访问者来源 IP 精确拦截。保存后会立即断开该 IP 当前连接，并拦截后续新请求。</p>

      <table class="data-table" v-if="localConfig.UserBlockRules.length > 0">
        <thead>
          <tr>
            <th>启用</th>
            <th>来源 IP</th>
            <th>备注</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(rule, i) in localConfig.UserBlockRules" :key="rule.Id">
            <td><input type="checkbox" v-model="rule.Enable" /></td>
            <td class="value-cell">{{ rule.Value }}</td>
            <td>{{ rule.Remarks }}</td>
            <td><button class="btn btn-danger-sm" @click="removeUserBlock(i)">删除</button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-hint">暂无用户拦截规则</p>

      <div class="add-row">
        <input v-model="newUserBlockRule.Value" placeholder="eg. 192.168.1.10, 10.0.0.5" class="input flex-fill" spellcheck="false" />
        <input v-model="newUserBlockRule.Remarks" placeholder="备注（可选）" class="input" />
        <label class="checkbox-label">
          <input type="checkbox" v-model="newUserBlockRule.Enable" />
          <span>启用</span>
        </label>
        <button class="btn btn-add" @click="addUserBlock">添加来源 IP</button>
      </div>
    </div>

    <!-- 实时拦截日志 -->
    <div class="section">
      <div class="section-header">
        <h3>实时拦截日志</h3>
        <button class="btn btn-secondary btn-sm" @click="wsStore.clearInterceptLogs()">清空</button>
      </div>

      <div class="log-container" v-if="wsStore.interceptLogs.length > 0">
        <table class="data-table log-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>规则类型</th>
              <th>目标</th>
              <th>客户端 IP</th>
              <th>规则值</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(log, i) in [...wsStore.interceptLogs].reverse()" :key="i">
              <td class="time-cell">{{ formatTime(log.time) }}</td>
              <td><span class="rule-badge">{{ log.rule_type }}</span></td>
              <td class="target-cell">{{ log.target }}</td>
              <td>{{ log.client_ip }}</td>
              <td class="value-cell">{{ log.rule_value }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.access-control {
  color: #cba376;
  max-width: 1000px;
}

.page-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.section {
  background: #2a2a2a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.section h3 {
  margin: 0 0 16px;
  font-size: 1rem;
  font-weight: 600;
  color: #cba376;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #333;
  transition: .3s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: #888;
  transition: .3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #0d4a65;
}

input:checked + .slider:before {
  transform: translateX(20px);
  background-color: #cba376;
}

.toggle-text {
  font-size: 0.85rem;
  color: #888;
}

.hint {
  margin: 8px 0 0;
  font-size: 0.8rem;
  color: #666;
}

.empty-hint {
  color: #555;
  font-size: 0.85rem;
  margin: 8px 0;
}

/* 表格 */
.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
  font-size: 0.85rem;
}

.data-table th,
.data-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #333;
  text-align: left;
}

.data-table th {
  color: #888;
  font-weight: 500;
}

.value-cell {
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: monospace;
  font-size: 0.82rem;
}

.target-cell {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time-cell {
  white-space: nowrap;
  color: #888;
  font-size: 0.82rem;
}

.rule-badge {
  background: rgba(203, 163, 118, 0.15);
  color: #cba376;
  border: 1px solid rgba(203, 163, 118, 0.3);
  border-radius: 3px;
  padding: 1px 6px;
  font-size: 0.78rem;
  white-space: nowrap;
}

.log-container {
  max-height: 360px;
  overflow-y: auto;
}

.log-table {
  margin-bottom: 0;
}

/* 添加行 */
.add-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 12px;
}

.flex-fill {
  flex: 1 1 260px;
}

.input {
  background: #1a1a1a;
  border: 1px solid #444;
  border-radius: 4px;
  color: #cba376;
  padding: 6px 10px;
  font-size: 0.85rem;
  min-width: 120px;
}

.input-select {
  min-width: 120px;
  cursor: pointer;
}

.input:focus {
  outline: none;
  border-color: #cba376;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
}

/* 按钮 */
.btn {
  padding: 7px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: opacity 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #cba376;
  color: #1a1a1a;
  font-weight: 600;
}

.btn-secondary {
  background: #333;
  color: #cba376;
  border: 1px solid #444;
}

.btn-sm {
  padding: 4px 12px;
  font-size: 0.8rem;
}

.save-btn-container {
  position: relative;
  display: inline-block;
}

.badge-dot {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 8px;
  height: 8px;
  background-color: #ff4d4f;
  border-radius: 50%;
  box-shadow: 0 0 0 2px #2a2a2a;
}

.btn-add {
  background: #2d4a3e;
  color: #5fad8a;
  border: 1px solid #3a6b55;
}

.btn-danger-sm {
  background: transparent;
  color: #e06c75;
  border: 1px solid #e06c75;
  padding: 3px 10px;
  font-size: 0.8rem;
}

.btn-danger-sm:hover {
  background: rgba(224, 108, 117, 0.1);
}

/* 提示框 */
.alert {
  padding: 10px 16px;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 0.85rem;
}

.alert-error {
  background: rgba(224, 108, 117, 0.15);
  color: #e06c75;
  border: 1px solid #e06c75;
}

.alert-success {
  background: rgba(95, 173, 138, 0.15);
  color: #5fad8a;
  border: 1px solid #5fad8a;
}
</style>
