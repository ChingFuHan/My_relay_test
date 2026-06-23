# New Agent Onboarding

如果你是第一次接手這個 repo，先看這三個檔：

1. [../user_quick_start.md](../user_quick_start.md)
   看最短成功流程。先知道 Windows host 和 Linux VM 各要做什麼。
2. [agent_handoff_2026-06-24.md](./agent_handoff_2026-06-24.md)
   看這次到底改了哪些東西、哪些已驗證、哪些還沒完全穩。
3. [../AGENTS.md](../AGENTS.md)
   看目前專案記憶、環境變數、路由慣例、關鍵檔案。

## 30 秒版現況

- 已驗證：Linux VM 可透過 `host-bridge` 控制 Windows Chrome 上的 ChatGPT
- 已驗證：簡單文字 relay 可成功往返
- 已補上：ChatGPT `logged-in` / `guest-or-logged-out` / `verification-required` 狀態判斷
- 未完全驗證：圖片流程、檔案上傳、Deep Research 匯出、部分 continuation/polling

## 關鍵路徑

- Host bridge: [../host-bridge/README.md](../host-bridge/README.md)
- Relay 主程式: [../plugins/gpt-relay/scripts/chatgpt_relay.mjs](../plugins/gpt-relay/scripts/chatgpt_relay.mjs)
- Host bridge adapter: [../plugins/gpt-relay/scripts/adapters/host_bridge_adapter.mjs](../plugins/gpt-relay/scripts/adapters/host_bridge_adapter.mjs)

## 最常用環境變數

Linux VM:

```bash
export GPT_RELAY_BROWSER_PROVIDER=host-bridge
export GPT_RELAY_HOST_BRIDGE_URL=http://192.168.0.72:8765
export GPT_RELAY_HOST_BRIDGE_TOKEN=change-me
```

Windows host:

```powershell
$env:HOST_BRIDGE_TOKEN='change-me'
$env:CHROME_CDP_URL='http://127.0.0.1:9222'
$env:HOST_BRIDGE_HOST='0.0.0.0'
```

## 第一個驗證動作

先不要直接猜功能有沒有通，先做這兩步：

1. 從 VM 打 health check 到 host bridge
2. 用 `請只回覆 OK。` 跑最小 relay 測試

這兩步都已經有成功案例，完整指令在 [../user_quick_start.md](../user_quick_start.md)。
