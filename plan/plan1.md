  # 概览界面修订计划

  ## 摘要

  - 已确认 src/stores/websocket.js 是现有 Pinia store，src/main.js 已通过 createPinia() 挂载。
  - 原方案方向需要修正：不要新建状态体系；应复用现有 useWebSocketStore、/api/config、WebSocket 订阅和路由动作。
  - 先落地 Pencil 概览 UI 与现有逻辑对齐；准确“总拦截次数”作为第二期数据链路改造，避免把 interceptLogs.length 误称为总
    数。

  ## 关键调整

  - 在 Overview.vue 中重排为设计稿结构：四个流量指标、安全策略卡、用户监控卡、实时流量图、活动连接表。
  - 概览页挂载时使用现有 store 方法补齐数据来源：
      - loadConfig() 获取安全策略配置。
      - subscribeUserTraffic() 获取用户监控卡数据，卸载时取消订阅。
      - 继续复用现有 subscribeTraffic()、subscribeConnections()。
  - 安全策略卡统计逻辑：
      - “域名拦截规则”统计启用的 AccessRules 数量。
      - “用户封禁 IP”统计启用的 UserBlockRules.Value 中逗号拆分、去空、去重后的 IP 数量。
      - “拦截次数”第一期改文案为“当前拦截日志”，绑定 wsStore.interceptLogs.length，不承诺总量。
  - 所有按钮必须绑定真实逻辑：
      - “查看策略”跳转 /dashboard/security-policy/access-control。
      - “进入用户监控”跳转 /dashboard/security-policy/user-monitoring。
      - “关闭所有连接”调用 wsStore.closeAllConnections()，无活跃连接或未连接时禁用。
      - “查看全部连接”始终跳转 /dashboard/connections。
  ## 接口与类型
  - 第二期如要恢复“总拦截次数”语义：
      - 后端在拦截命中处维护原子计数器。
      - /api/config 或新增 /api/stats 返回 interceptCount。
      - intercept_log_batch payload 附带后端权威 interceptCount。
      - 现有 Pinia store 增加 interceptCount 字段，清空日志不影响该字段。

  ## 测试计划

  - 运行前端构建校验：npm run build。
  - 登录后直接进入概览，验证流量、连接、安全策略、用户监控数据都能显示。
  - 在访问控制页新增/禁用/删除规则后返回概览，验证规则数和封禁 IP 数即时更新。
  - 在用户监控页产生用户流量后返回概览，验证用户卡片不依赖是否曾打开该页。
  - 点击“关闭所有连接”“查看全部连接”“查看策略”“进入用户监控”“同步后端配置”，确认每个按钮有真实行为。
  - 清空拦截日志后确认第一期“当前拦截日志”归零；第二期实施后确认“总拦截次数”不受清空影响。