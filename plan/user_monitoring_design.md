# 用户流量监控模块 — 数据结构与设计方案

## Context

当前后端 `user_traffic` 推送的 `UserSnapshotItem` 缺少 `online` 字段，前端无法判断某个 IP 是否仍有活跃连接。接口文档 (`plan.md`) 已定义了 `online: bool`，但后端代码未实现。需要补齐后端 `online` 字段，并完成前端 `UserMonitoring.vue` 页面的设计。

---

## 一、后端数据结构变更

### 1.1 修改 `UserSnapshotItem`（`proxycore/mproxy/user_monitor.go`）

在现有结构体增加 `Online` 字段：

```
UserSnapshotItem {
    IP        string        `json:"ip"`
    Online    bool          `json:"online"`     // ← 新增
    TotalUp   int64         `json:"totalUp"`
    TotalDown int64         `json:"totalDown"`
    Hosts     []HostTraffic `json:"hosts"`
}
```

### 1.2 `online` 判断逻辑

**数据源**：`CoreHttpServer.Connections` (sync.Map)，其中每个 `ConnectionInfo` 包含 `RemoteAddr`（格式 `ip:port`）和 `Status`（`"Active"` / `"Closed"`）。

**判断规则**：

- 遍历 `Connections`，提取每个连接的 IP（`ExtractIP(info.RemoteAddr)`）
- 若该 IP 存在至少一个 `Status == "Active"` 的连接 → `online: true`
- 否则 → `online: false`

### 1.3 `Snapshot()` 方法改造

当前 `Snapshot()` 是 `GlobalUserMonitor` 的方法，无法访问 `Connections`。需要改造为接收 `Connections` 引用或活跃 IP 集合作为参数。

**推荐方案**：在推送器中预先构建活跃 IP 集合，传入 `Snapshot`：

```
Snapshot(activeIPs map[string]bool) []UserSnapshotItem
```

推送器逻辑（`hub.go` 的 `StartUserTrafficPusher`）：

1. 遍历 `proxy.Connections`，构建 `activeIPs` 集合（仅包含有 Active 状态连接的 IP）
2. 调用 `Snapshot(activeIPs)`
3. `Snapshot` 内部为每个 IP 设置 `Online: activeIPs[ip]`

### 1.4 推送数据格式（与接口文档 `plan.md` 对齐）

```json
{
  "type": "user_traffic",
  "data": [
    {
      "ip": "192.168.1.100",
      "online": true,
      "totalUp": 1234567,
      "totalDown": 9876543,
      "hosts": [
        { "host": "google.com", "up": 500000, "down": 3000000 }
      ]
    }
  ]
}
```

---

## 二、前端数据结构

### 2.1 WebSocket Store 扩展（`proxyui/src/stores/websocket.js`）

新增状态和方法：

- **状态**：`userTrafficList: []` — 存储最新的用户流量快照
- **订阅方法**：`subscribeUserTraffic(callback)` — 监听 `user_traffic` 消息，更新 `userTrafficList` 并回调
- **取消订阅**：`unsubscribeUserTraffic()` — 从订阅 topics 中移除 `user_traffic`
- **断开操作**：`closeUserConnections(ip)` — 发送 `{ action: "closeUserConnections", ip }` 消息

消息处理逻辑：收到 `msg.type === "user_traffic"` 时，直接替换 `userTrafficList = msg.data`。

### 2.2 前端数据类型定义（TypeScript 风格描述）

```
UserTrafficItem {
  ip: string           // 客户端纯 IP
  online: boolean      // 是否有活跃连接
  totalUp: number      // 该 IP 累计上行字节
  totalDown: number    // 该 IP 累计下行字节
  hosts: HostTraffic[] // 按 Host 拆分的明细
}

HostTraffic {
  host: string   // 目标域名
  up: number     // 该 Host 上行累计字节
  down: number   // 该 Host 下行累计字节
}
```

---

## 三、前端页面设计（`UserMonitoring.vue`）

### 3.1 路由与导航

| 修改文件                                     | 变更内容                                                     |
| -------------------------------------------- | ------------------------------------------------------------ |
| `proxyui/src/router/index.js`                | 在 `security-policy` 子路由下新增 `user-monitoring`          |
| `proxyui/src/views/SecurityPolicyLayout.vue` | `subPages` 数组增加 `{ path: '...user-monitoring', label: '用户监控' }` |
| `proxyui/src/views/dashboard.vue`            | 侧边栏"安全策略"折叠菜单下新增 `用户监控` 链接               |

### 3.2 页面布局

```
┌─────────────────────────────────────────────────────┐
│ [搜索框: 按IP过滤]         活跃IP: N / 总IP: M      │
├─────────────────────────────────────────────────────┤
│ 状态 │ IP地址          │ 总上行  │ 总下行  │ 操作   │
│──────┼─────────────────┼─────────┼─────────┼────────│
│ 🟢   │ 192.168.1.100   │ 1.2 MB  │ 9.4 MB  │ [断开] │
│  ├── │  google.com     │ 500 KB  │ 3.0 MB  │        │
│  └── │  github.com     │ 734 KB  │ 6.8 MB  │        │
│ 🔴   │ 10.0.0.5        │ 86 KB   │ 500 KB  │ [断开] │
│  └── │  example.com    │ 86 KB   │ 500 KB  │        │
└─────────────────────────────────────────────────────┘
```

- **主行**：IP 级别汇总，显示在线状态、IP、累计流量、操作按钮
- **展开行**：Host 级别明细，点击主行可展开/收起
- **在线状态**：`online: true` → 绿色圆点，`online: false` → 红色圆点
- **排序**：在线 IP 优先，同状态按总流量（totalUp + totalDown）降序
- **流量格式化**：`formatBytes(n)` 自动转换 B/KB/MB/GB

### 3.3 虚拟滚动（必须使用，防止高并发卡死）

与 `Connections.vue` 完全相同的 `@tanstack/vue-virtual` 方案：

**数据扁平化**：将 IP 主行 + 展开的 Host 子行构建为一维数组 `flatList`，IP 行标记 `isParent: true`，Host 行标记 `isParent: false`。与 `Connections.vue` 中 `sortedConnections` 的父子扁平化逻辑一致。

**虚拟滚动器配置**：

```
useVirtualizer(computed(() => ({
  count: flatList.value.length,
  getScrollElement: () => scrollerRef.value,
  estimateSize: () => 48,       // 预估行高
  overscan: 10,                 // 预渲染行数
  getItemKey: (index) => flatList 中对应元素的唯一 key
})))
```

**渲染结构**（与 `Connections.vue` 一致的三层容器模式）：

1. **滚动容器** `div.scroller`（ref=scrollerRef，固定高度 overflow-y: auto）
2. **虚拟高度撑开层** `div`（`height: totalSize + 'px'`，position: relative）
3. **虚拟行** `v-for="row in virtualRows"`（absolute 定位，translateY 偏移）

每个虚拟行内部根据 `isParent` 渲染 IP 主行或 Host 子行。

### 3.4 交互行为

| 操作      | 触发            | 效果                                      |
| --------- | --------------- | ----------------------------------------- |
| 搜索      | 输入框输入      | 按 IP 前缀模糊过滤列表                    |
| 展开/收起 | 点击主行        | 切换 hosts 明细行的显示                   |
| 断开连接  | 点击"断开"按钮  | 发送 `closeUserConnections`，二次确认弹窗 |
| 实时刷新  | 自动（2秒间隔） | 后端推送触发列表更新                      |

### 3.4 生命周期

- `onMounted`：调用 `wsStore.subscribeUserTraffic()`，开始接收数据
- `onUnmounted`：调用 `wsStore.unsubscribeUserTraffic()`，停止接收

---

## 四、关键文件清单

| 文件                                         | 操作 | 说明                                                         |
| -------------------------------------------- | ---- | ------------------------------------------------------------ |
| `proxycore/mproxy/user_monitor.go`           | 修改 | `UserSnapshotItem` 增加 `Online` 字段；`Snapshot()` 增加 `activeIPs` 参数 |
| `proxycore/proxysocket/hub.go`               | 修改 | `StartUserTrafficPusher` 中构建 activeIPs 集合并传入 Snapshot |
| `proxyui/src/stores/websocket.js`            | 修改 | 新增 userTraffic 状态和订阅/断开方法                         |
| `proxyui/src/router/index.js`                | 修改 | 新增 user-monitoring 路由                                    |
| `proxyui/src/views/SecurityPolicyLayout.vue` | 修改 | subPages 新增条目                                            |
| `proxyui/src/views/dashboard.vue`            | 修改 | 侧边栏新增子菜单                                             |
| `proxyui/src/views/UserMonitoring.vue`       | 新建 | 用户监控主页面                                               |

---

## 五、验证方式

1. **后端验证**：启动代理后，用 WebSocket 客户端连接并订阅 `user_traffic`，确认推送数据包含 `online` 字段
2. **前端验证**：进入 `后台 → 安全策略 → 用户监控`，确认 UI 正常渲染、实时更新、在线/离线状态正确
3. **断开测试**：点击"断开"按钮后，目标设备连接立即中断，UI 状态切换为离线