<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { KeyRound, Link2, Server, ShieldCheck } from 'lucide-vue-next'
import { useWebSocketStore } from '@/stores/websocket'

const apiUrl = ref(window.location.origin)
const secret = ref('123')
const label = ref('')
const servers = ref([])

const wsStore = useWebSocketStore()
const router = useRouter()

// 监听连接状态，连接成功后跳转到仪表盘
watch(
  () => wsStore.isConnected,
  (connected) => {
    if (connected) {
      router.push('/dashboard')
    }
  }
)

const login = () => {
  wsStore.connect(apiUrl.value, secret.value)
  addServer()
}

const addServer = () => {
  // 检查是否已存在（可选）
  const exists = servers.value.some((s) => s.url === apiUrl.value && s.secret === secret.value)
  if (!exists) {
    servers.value.push({
      url: apiUrl.value,
      secret: secret.value,
      label: label.value,
    })
  }
}

const connectSaved = (server) => {
  apiUrl.value = server.url
  secret.value = server.secret
  wsStore.connect(server.url, server.secret)
}
</script>

<template>
  <div class="login-page">
    <section class="login-intro">
      <div class="login-brand">
        <div class="login-brand-mark">
          <ShieldCheck :size="22" stroke-width="2.6" />
        </div>
        <span>PROXY&nbsp; MAN</span>
      </div>

      <div class="intro-copy">
        <h1>连接代理核心后进入实时控制台</h1>
        <p>当前登录页只负责输入 API Base URL、Secret 和可选 Label；连接成功后由路由守卫进入控制台。</p>
      </div>

      <div class="recent-card">
        <div class="recent-title">项目接入示例</div>
        <div class="recent-lines">
          <div>
            <span>WebSocket：</span>
            <code>/start?token=secret</code>
          </div>
          <div>
            <span>完整地址：</span>
            <code>自动拼接 /dashboard</code>
          </div>
          <div>
            <span>推荐格式：</span>
            <code>http(s) url + secret</code>
          </div>
        </div>
      </div>
    </section>

    <main class="login-main">
      <div class="login-heading">
        <h2>添加服务器</h2>
        <p>填写后点击 Add，连接成功后会自动订阅流量、连接和日志。</p>
      </div>

      <form class="login-form-card" @submit.prevent="login">
        <label class="field field-full">
          <span>API Base URL</span>
          <div class="field-control">
            <Link2 :size="17" />
            <input v-model="apiUrl" type="text" placeholder="http://127.0.0.1:8000" />
          </div>
        </label>

        <label class="field">
          <span>Secret(optional)</span>
          <div class="field-control">
            <KeyRound :size="17" />
            <input v-model="secret" type="text" placeholder="123" />
          </div>
        </label>

        <label class="field">
          <span>Label(optional)</span>
          <div class="field-control">
            <Server :size="17" />
            <input v-model="label" type="text" placeholder="本地调试" />
          </div>
        </label>

        <div class="form-footer">
          <span class="save-hint">连接时保存到当前会话的最近连接</span>
          <button class="pm-button pm-button-primary" type="submit">Add</button>
        </div>
      </form>

      <section class="saved-section">
        <h3>已保存服务器</h3>
        <div class="server-list">
          <div v-if="servers.length === 0" class="saved-empty">暂无已保存服务器</div>
          <div v-for="(server, index) in servers" :key="index" class="server-item">
            <div>
              <div class="server-name">{{ server.label || '已保存服务器' }}</div>
              <div class="server-url">{{ server.url }}</div>
            </div>
            <button class="server-action" type="button" @click="connectSaved(server)">连接</button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.login-page {
  display: grid;
  min-height: 100vh;
  grid-template-columns: 420px minmax(0, 1fr);
  background: var(--pm-bg);
  color: var(--pm-text);
}

.login-intro {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  gap: 28px;
  background: var(--pm-sidebar);
  border-right: 1px solid var(--pm-border);
  padding: 36px;
}

.login-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--pm-text);
  font-family: var(--pm-mono);
  font-weight: 800;
}

.login-brand-mark {
  display: inline-flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--pm-primary);
  color: #111111;
}

.intro-copy {
  margin-top: 38px;
}

.intro-copy h1,
.login-heading h2 {
  margin: 0;
  color: var(--pm-text);
  font-size: 30px;
  line-height: 1.2;
  font-weight: 800;
}

.intro-copy p,
.login-heading p {
  margin: 18px 0 0;
  color: var(--pm-muted);
  line-height: 1.6;
}

.recent-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 22px;
  min-height: 220px;
  border: 1px solid var(--pm-border);
  border-radius: var(--pm-radius);
  background: #111111;
  padding: 20px;
}

.recent-title {
  color: var(--pm-muted);
  font-weight: 700;
}

.recent-lines {
  display: grid;
  gap: 14px;
  color: var(--pm-text);
  line-height: 1.5;
}

.recent-lines code {
  color: var(--pm-muted);
  font-family: var(--pm-mono);
}

.login-main {
  display: flex;
  width: min(680px, calc(100vw - 480px));
  flex-direction: column;
  justify-content: center;
  gap: 28px;
  padding: 72px 88px;
}

.login-form-card {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px 16px;
  border: 1px solid var(--pm-border);
  border-radius: var(--pm-radius);
  background: var(--pm-surface);
  padding: 24px;
}

.field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
}

.field-full {
  grid-column: 1 / -1;
}

.field > span {
  color: var(--pm-text);
  font-weight: 800;
}

.field-control {
  display: flex;
  min-height: 40px;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--pm-border);
  border-radius: var(--pm-pill);
  background: #111111;
  padding: 0 14px;
  color: var(--pm-muted);
}

.field-control:focus-within {
  border-color: var(--pm-primary);
  box-shadow: 0 0 0 3px rgba(255, 132, 0, 0.14);
}

.field-control input {
  min-width: 0;
  flex: 1;
  border: 0 !important;
  background: transparent !important;
  color: var(--pm-text);
  outline: none;
  padding: 0 !important;
}

.form-footer {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.save-hint {
  color: var(--pm-muted);
}

.saved-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.saved-section h3 {
  margin: 0;
  color: var(--pm-muted);
  font-size: 15px;
}

.server-list {
  display: grid;
  gap: 10px;
}

.saved-empty,
.server-item {
  display: flex;
  min-height: 66px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid var(--pm-border);
  border-radius: var(--pm-radius);
  background: var(--pm-surface);
  padding: 14px;
}

.saved-empty {
  justify-content: center;
  color: var(--pm-muted);
}

.server-name {
  color: var(--pm-text);
  font-weight: 800;
}

.server-url {
  margin-top: 5px;
  color: var(--pm-muted);
  font-family: var(--pm-mono);
}

.server-action {
  border: 0;
  background: transparent;
  color: var(--pm-primary);
  cursor: default;
  font-weight: 800;
}

@media (max-width: 920px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .login-intro {
    min-height: auto;
    padding: 28px;
  }

  .recent-card {
    min-height: 0;
  }

  .login-main {
    width: 100%;
    padding: 32px 28px;
  }
}

@media (max-width: 640px) {
  .login-form-card {
    grid-template-columns: 1fr;
  }

  .form-footer {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
