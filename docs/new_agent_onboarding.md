# New Agent Onboarding

如果你是第一次接手這個 repo，先看這三個檔：

1. [deployment-modes.md](./deployment-modes.md)
   先判斷使用者是哪種部署模式，不要預設是 VM。
2. [agent_handoff_2026-06-24.md](./agent_handoff_2026-06-24.md)
   看這次到底改了哪些東西、哪些已驗證、哪些還沒完全穩。
3. [../AGENTS.md](../AGENTS.md)
   看目前專案記憶、環境變數、路由慣例、關鍵檔案。
4. [../user_quick_start.md](../user_quick_start.md)
   如果使用者場景剛好是 Windows host + Linux VM，這份是目前最短已驗證流程。
5. [new-codex-session.md](./new-codex-session.md)
   如果需求是「換一個 repo 開新 Codex 仍可問 ChatGPT」，先確認全域安裝與 prompt 命令。

## 30 秒版現況

- 已驗證：Host/Guest 模式可透過 `host-bridge` 控制另一側的 Chrome 上的 ChatGPT
- 已驗證：簡單文字 relay 可成功往返
- 已補上：ChatGPT `logged-in` / `guest-or-logged-out` / `verification-required` 狀態判斷
- 已補上：可由 `@` 選取的 GPT Relay plugin，以及一般 Node CLI 入口
- 未完全驗證：圖片流程、檔案上傳、Deep Research 匯出、部分 continuation/polling

## 關鍵路徑

- Host bridge: [../host-bridge/README.md](../host-bridge/README.md)
- Relay 主程式: [../plugins/gpt-relay/scripts/chatgpt_relay.mjs](../plugins/gpt-relay/scripts/chatgpt_relay.mjs)
- Host bridge adapter: [../plugins/gpt-relay/scripts/adapters/host_bridge_adapter.mjs](../plugins/gpt-relay/scripts/adapters/host_bridge_adapter.mjs)

## 最常用環境變數

Codex side example:

```bash
export GPT_RELAY_BROWSER_PROVIDER=host-bridge
export GPT_RELAY_HOST_BRIDGE_URL=http://192.168.0.72:8765
export GPT_RELAY_HOST_BRIDGE_TOKEN=change-me
```

Bridge side example:

```powershell
$env:HOST_BRIDGE_TOKEN='change-me'
$env:CHROME_CDP_URL='http://127.0.0.1:9222'
$env:HOST_BRIDGE_HOST='0.0.0.0'
```

## 第一個驗證動作

先不要直接猜功能有沒有通，先做這兩步：

1. 先判斷是 Local / Host-Guest / Remote 哪種模式
2. 用 `請只回覆 OK。` 跑最小 relay 測試

目前完整成功案例在 [../user_quick_start.md](../user_quick_start.md)。
