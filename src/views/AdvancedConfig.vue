<script setup>
import { ref, onMounted, computed } from 'vue'
import { useWebSocketStore } from '@/stores/websocket.js'

const wsStore = useWebSocketStore()

const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

// 高级设置选项
const advancedOptions = [
  { key: 'Verbose', label: '详细日志', hint: '记录每个代理请求的详细信息' },
  { key: 'KeepAcceptEncoding', label: '保留编码格式', hint: '保留客户端的 Accept-Encoding 请求头' },
  { key: 'PreventParseHeader', label: '禁止解析 Header', hint: '保留非标请求头部' },
  { key: 'KeepDestHeaders', label: '保留目标 Header', hint: '保留自定义响应头 (建议开启)' },
  { key: 'ConnectMaintain', label: '隧道维持', hint: '持久维持隧道连接' },
  { key: 'MitmEnabled', label: '启用 MITM', hint: '开启中间人模式总开关 (谨慎使用，正常使用时请保持关闭)' },
  { key: 'HttpMitmNoTunnel', label: '非隧道HTTP MITM', hint: 'http的MITM劫持,http使用的是full url而不是connect' }
]

// 本地配置副本
const localConfig = ref({
  Port: 8080,
  Verbose: true,
  KeepAcceptEncoding: false,
  PreventParseHeader: false,
  KeepDestHeaders: true,
  ConnectMaintain: false,
  MitmEnabled: false,
  HttpMitmNoTunnel: false,
  PublicIPs: [],  // 新增
  MinioConfig: {
    endpoint: '127.0.0.1:9000',
    publicEndpoint: '',
    accessKeyId: 'root',
    secretAccessKey: '12345678',
    useSSL: false,
    bucket: 'bodydata',
    enabled: true,
  }
})

// 公网 IP 输入（逗号分隔的字符串）
const publicIPsText = ref('')
const ipValidationError = ref('')

// 将数组转换为逗号分隔字符串
const arrayToCommaString = (arr) => {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return ''
  return arr.join(', ')
}

// 验证并解析 IP 输入
function validateAndParseIPs() {
  const text = publicIPsText.value.trim()
  ipValidationError.value = ''

  if (!text) {
    localConfig.value.PublicIPs = []
    return
  }

  // 检测分隔符：必须使用英文逗号
  if (text.includes('，') || text.includes('、')) {
    ipValidationError.value = '错误：必须使用英文逗号 (,) 分隔 IP 地址'
    // 恢复原有值
    publicIPsText.value = arrayToCommaString(localConfig.value.PublicIPs)
    return
  }

  // 分割并清理
  const parts = text.split(',').map(s => s.trim()).filter(s => s)

  if (parts.length === 0) {
    localConfig.value.PublicIPs = []
    return
  }

  // 基本验证：每个部分不能为空
  for (const part of parts) {
    if (!part) {
      ipValidationError.value = '错误：IP 地址不能为空'
      publicIPsText.value = arrayToCommaString(localConfig.value.PublicIPs)
      return
    }
  }

  // 保存解析后的 IP 列表
  localConfig.value.PublicIPs = parts
  publicIPsText.value = arrayToCommaString(parts)
}

// 变更检测
const originalConfigStr = ref('')
const hasChanges = computed(() => {
  if (!originalConfigStr.value) return false
  return JSON.stringify(localConfig.value) !== originalConfigStr.value
})

onMounted(async () => {
  await loadConfig()
})

async function loadConfig() {
  loading.value = true
  errorMsg.value = ''
  try {
    const cfg = await wsStore.loadConfig()
    localConfig.value = {
      Port: cfg.Port ?? 8080,
      Verbose: cfg.Verbose ?? true,
      KeepAcceptEncoding: cfg.KeepAcceptEncoding ?? false,
      PreventParseHeader: cfg.PreventParseHeader ?? false,
      KeepDestHeaders: cfg.KeepDestHeaders ?? true,
      ConnectMaintain: cfg.ConnectMaintain ?? false,
      MitmEnabled: cfg.MitmEnabled ?? false,
      HttpMitmNoTunnel: cfg.HttpMitmNoTunnel ?? false,
      PublicIPs: cfg.PublicIPs ?? []  // 新增
    }
    // 新增：同步到文本框
    publicIPsText.value = arrayToCommaString(localConfig.value.PublicIPs)
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
    const current = wsStore.config
    const merged = { ...current, ...localConfig.value }
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
</script>

<template>
  <div class="advanced-config">
    <div class="page-header">
      <div class="pm-head-copy">
        <h2>高级设置</h2>
        <p class="pm-page-subtitle">代理端口、防环地址与代理行为开关。</p>
      </div>
      <div class="header-actions">
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
    </div>

    <div v-if="errorMsg" class="alert alert-error">{{ errorMsg }}</div>
    <div v-if="successMsg" class="alert alert-success">{{ successMsg }}</div>

    <!-- 代理端口 -->
    <div class="section">
      <h3>代理端口</h3>
      <div class="port-row">
        <span>监听端口</span>
        <input type="number" v-model.number="localConfig.Port" class="input input-port" min="1" max="65535" />
        <span class="hint" style="margin: 0">修改后需重启代理服务生效</span>
      </div>
    </div>

    <!-- ===== 新增：代理防环配置 ===== -->
    <div class="section">
      <h3>代理防环&证书配置(证书默认已经添加本地回环,下面的地址会追加到服务器证书中)</h3>
      <div class="public-ips-row">
        <span>公网 IP 列表</span>
        <input
          type="text"
          v-model="publicIPsText"
          class="input input-ips"
          placeholder="117.72.191.85, gzyddyx.com"
          @blur="validateAndParseIPs"
        />
        <span class="hint">多个 IP/域名用英文逗号分隔，云服务器部署时必须配置</span>
      </div>
      <div v-if="ipValidationError" class="alert alert-error" style="margin-top: 10px;">
        {{ ipValidationError }}
      </div>
      <div v-if="localConfig.PublicIPs && localConfig.PublicIPs.length > 0" class="ips-display">
        <span class="ips-label">已配置：</span>
        <span v-for="(ip, idx) in localConfig.PublicIPs" :key="idx" class="ip-tag">{{ ip }}</span>
      </div>
    </div>
    <!-- ===== 新增结束 ===== -->

    <!-- 高级开关 -->
    <div class="section">
      <h3>代理行为</h3>
      <label class="toggle-label" v-for="opt in advancedOptions" :key="opt.key">
        <span>{{ opt.label }}</span>
        <div class="switch">
          <input type="checkbox" v-model="localConfig[opt.key]" />
          <span class="slider"></span>
        </div>
        <span class="toggle-text">{{ localConfig[opt.key] ? '已启用' : '已禁用' }}</span>
        <span class="hint" style="margin: 0; margin-left: 4px">{{ opt.hint }}</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.advanced-config {
  color: #cba376;
  max-width: 1000px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 1.4rem;
  font-weight: 600;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
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

.port-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.input {
  background: #1a1a1a;
  border: 1px solid #444;
  border-radius: 4px;
  color: #cba376;
  padding: 6px 10px;
  font-size: 0.85rem;
}

.input-port {
  width: 100px;
  min-width: 100px;
}

.input:focus {
  outline: none;
  border-color: #cba376;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.toggle-label + .toggle-label {
  margin-top: 12px;
}

/* Switch 开关样式 */
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
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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

.public-ips-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.input-ips {
  flex: 1;
  min-width: 300px;
}

.ips-display {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ips-label {
  font-size: 0.85rem;
  color: #888;
}

.ip-tag {
  background: #0d4a65;
  color: #cba376;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-family: monospace;
}

.advanced-config {
  display: flex;
  max-width: none;
  min-height: 100%;
  flex-direction: column;
  gap: 18px;
  padding: 28px 32px;
  background: var(--pm-bg);
}

.page-header,
.section {
  margin-bottom: 0;
}

.port-row,
.public-ips-row,
.toggle-label {
  flex-wrap: wrap;
}

.input-ips {
  min-width: min(100%, 320px);
}

.ip-tag {
  background: rgba(255, 132, 0, 0.14);
  color: var(--pm-primary);
  border-radius: var(--pm-pill);
}

@media (max-width: 760px) {
  .advanced-config {
    padding: 20px;
  }
}
</style>
