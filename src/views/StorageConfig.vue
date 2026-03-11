<script setup>
import { ref, onMounted, computed } from 'vue'
import { useWebSocketStore } from '@/stores/websocket.js'

const wsStore = useWebSocketStore()

const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

// 本地 MinIO 配置副本
const localConfig = ref({
  endpoint: '127.0.0.1:9000',
  publicEndpoint: '',
  accessKeyId: 'root',
  secretAccessKey: '12345678',
  useSSL: false,
  bucket: 'bodydata',
  enabled: true,
})

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
      endpoint: cfg.MinioConfig?.endpoint ?? '127.0.0.1:9000',
      publicEndpoint: cfg.MinioConfig?.publicEndpoint ?? '',
      accessKeyId: cfg.MinioConfig?.accessKeyId ?? 'root',
      secretAccessKey: cfg.MinioConfig?.secretAccessKey ?? '12345678',
      useSSL: cfg.MinioConfig?.useSSL ?? false,
      bucket: cfg.MinioConfig?.bucket ?? 'bodydata',
      enabled: cfg.MinioConfig?.enabled ?? true,
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
    const current = wsStore.config
    const merged = { ...current, MinioConfig: localConfig.value }
    await wsStore.saveConfig(merged)
    originalConfigStr.value = JSON.stringify(localConfig.value)
    successMsg.value = '配置已保存，重启服务后生效'
    setTimeout(() => { successMsg.value = '' }, 4000)
  } catch (e) {
    errorMsg.value = `保存失败: ${e.message}`
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="storage-config">
    <div class="page-header">
      <h2>存储配置</h2>
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

    <!-- MinIO 对象存储配置 -->
    <div class="section">
      <div class="section-title-row">
        <h3>MinIO 对象存储</h3>
        <label class="toggle-label inline">
          <div class="switch">
            <input type="checkbox" v-model="localConfig.enabled" />
            <span class="slider"></span>
          </div>
          <span class="toggle-text">{{ localConfig.enabled ? '已启用' : '已禁用' }}</span>
        </label>
      </div>

      <div v-if="!localConfig.enabled" class="alert alert-warning" style="margin-bottom: 16px;">
        禁用存储将导致 Body 捕获功能不可用
      </div>

      <div class="form-grid">
        <div class="form-item">
          <label class="form-label">内网 Endpoint</label>
          <input
            type="text"
            v-model="localConfig.endpoint"
            class="input"
            placeholder="127.0.0.1:9000"
            :disabled="!localConfig.enabled"
          />
          <span class="hint">MinIO 服务地址（代理服务器访问用）</span>
        </div>

        <div class="form-item">
          <label class="form-label">公网 Endpoint</label>
          <input
            type="text"
            v-model="localConfig.publicEndpoint"
            class="input"
            placeholder="example.com:9000"
            :disabled="!localConfig.enabled"
          />
          <span class="hint">外网可访问的地址，用于生成预签名直链（留空则无法下发直链）</span>
        </div>

        <div class="form-item">
          <label class="form-label">Access Key ID</label>
          <input
            type="text"
            v-model="localConfig.accessKeyId"
            class="input"
            placeholder="root"
            :disabled="!localConfig.enabled"
          />
        </div>

        <div class="form-item">
          <label class="form-label">Secret Access Key</label>
          <input
            type="text"
            v-model="localConfig.secretAccessKey"
            class="input"
            placeholder="••••••••"
            :disabled="!localConfig.enabled"
          />
        </div>

        <div class="form-item">
          <label class="form-label">Bucket</label>
          <input
            type="text"
            v-model="localConfig.bucket"
            class="input"
            placeholder="bodydata"
            :disabled="!localConfig.enabled"
          />
        </div>

        <div class="form-item">
          <label class="form-label">使用 SSL</label>
          <div class="switch-row">
            <label class="toggle-label">
              <div class="switch">
                <input type="checkbox" v-model="localConfig.useSSL" :disabled="!localConfig.enabled" />
                <span class="slider"></span>
              </div>
              <span class="toggle-text">{{ localConfig.useSSL ? '已启用' : '已禁用' }}</span>
            </label>
          </div>
          <span class="hint warning-text">如无特殊需求请勿开启</span>
        </div>
      </div>
    </div>

    <div class="section info-section">
      <p class="info-text">配置修改后需重启代理服务生效</p>
    </div>
  </div>
</template>

<style scoped>
.storage-config {
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

.section-title-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.section-title-row h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #cba376;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 0.85rem;
  color: #aaa;
  font-weight: 500;
}

.input {
  background: #1a1a1a;
  border: 1px solid #444;
  border-radius: 4px;
  color: #cba376;
  padding: 8px 10px;
  font-size: 0.85rem;
  width: 100%;
  box-sizing: border-box;
}

.input:focus {
  outline: none;
  border-color: #cba376;
}

.input:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.switch-row {
  display: flex;
  align-items: center;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.toggle-label.inline {
  margin-left: auto;
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
  font-size: 0.78rem;
  color: #666;
}

.warning-text {
  color: #e06c75;
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

.alert-warning {
  background: rgba(229, 192, 123, 0.12);
  color: #e5c07b;
  border: 1px solid #e5c07b;
}

.info-section {
  padding: 14px 20px;
}

.info-text {
  margin: 0;
  font-size: 0.82rem;
  color: #666;
}
</style>
