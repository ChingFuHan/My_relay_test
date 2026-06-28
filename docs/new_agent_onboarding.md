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
6. [usage-codex-and-claude-code.md](./usage-codex-and-claude-code.md)
   一份就懂 repo 在做什麼 + Codex 用法 + **Claude Code 用法**。要同時支援兩種 agent 先看這份。

## 30 秒版現況

- 已驗證：Host/Guest 模式可透過 `host-bridge` 控制另一側的 Chrome 上的 ChatGPT
- 已驗證：簡單文字 relay 可成功往返，包含 Windows 本機 host-bridge 的訪客模式
- 已補上：ChatGPT `guest` / `logged-in` / `guest-or-logged-out` / `verification-required` 狀態判斷
- 訪客只可做純文字 relay；不可要求登入、附件、圖片、Deep Research、續問或 polling
- 已補上：可由 `@` 選取的 GPT Relay plugin，以及一般 Node CLI 入口
- 已新增：可由 `@` 選取的 Gemini Relay plugin。功能對齊 GPT Relay:`ask` / `continue` / `poll` / `list_sessions` + session 儲存。已登入可續問/輪詢,訪客只可純文字(無穩定對話 URL)。
- 已新增:**Codex slash 命令(skills)**。`codex/skills/<name>/SKILL.md` 裝到 `~/.codex/skills/`(安裝腳本自動;與 `/caveman` 同機制),提供 `/chatgpt*`、`/gemini*`,強制走 web、不本地作答(工具名為 Codex 底線式 `mcp__gpt_relay__*`)。
- 已完成：**Claude Code 整合(兩個 relay 皆是)**。同一支 `mcp_server.mjs` 以 user scope 掛進 Claude Code(全域)。2026-06-25 實測 Gemini 的 `ask`/`continue`/`poll`/`list_sessions` 經 :8765 全通,`gpt-relay`/`gemini-relay` 皆 ✔ Connected。詳見 [usage-codex-and-claude-code.md](./usage-codex-and-claude-code.md) 與 [usage-gemini-codex-and-claude-code.md](./usage-gemini-codex-and-claude-code.md)。
- 未完全驗證:ChatGPT 圖片流程、檔案上傳、Deep Research 匯出、長任務 continuation/polling

## 關鍵路徑

- Host bridge: [../host-bridge/README.md](../host-bridge/README.md)
- Relay 主程式: [../plugins/gpt-relay/scripts/chatgpt_relay.mjs](../plugins/gpt-relay/scripts/chatgpt_relay.mjs)
- MCP server（Codex/Claude Code 共用入口）: [../plugins/gpt-relay/scripts/mcp_server.mjs](../plugins/gpt-relay/scripts/mcp_server.mjs)
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

1. 先判斷是 Local / Host-Guest / Remote 哪種部署模式
2. 再判斷 ChatGPT 是訪客或已登入；訪客只能送純文字新任務，不能續問或 polling
3. 用 `請只回覆 OK。` 跑最小 relay 測試

目前完整成功案例在 [../user_quick_start.md](../user_quick_start.md)。
