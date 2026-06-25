# Gemini Relay 使用指南:Codex 與 Claude Code

> 一份就懂:gemini-relay 在做什麼、Codex 怎麼用、Claude Code 怎麼用。
> 與 [usage-codex-and-claude-code.md](./usage-codex-and-claude-code.md)(ChatGPT 版)是平行設計。

## 1. 這個外掛是什麼

**Gemini Relay** 讓 AI coding agent(Codex 或 Claude Code)把提問轉給**網頁版 Gemini**,
再把 Gemini 的回答與對話連結帶回 agent。底層橋接與 gpt-relay 共用同一條 `host-bridge`。

資料流:

```
Agent (Codex / Claude Code)
  → gemini-relay MCP server (stdio, JSON-RPC)
  → host-bridge HTTP :8765   ← 在「有 Chrome 的那台機器」上跑(與 gpt-relay 共用)
  → Chrome CDP :9222
  → 網頁版 Gemini (gemini.google.com/app)
  → 原路帶回
```

### 核心檔案

| 檔案 | 角色 |
| --- | --- |
| `plugins/gemini-relay/scripts/mcp_server.mjs` | 可攜的 stdio MCP server。工具:`ask` / `continue` / `poll` / `list_sessions`。Codex 與 Claude Code **共用同一支**。 |
| `plugins/gemini-relay/scripts/gemini_relay.mjs` | relay 主程式(開分頁、判斷登入狀態、送 prompt、判斷完成、擷取對話 URL、存 session)。 |
| `plugins/gemini-relay/scripts/adapters/host_bridge_adapter.mjs` | `host-bridge` provider:把 Playwright 操作轉成對 :8765 的 HTTP 呼叫。 |
| `host-bridge/server.mjs` | 在有 Chrome 那台機器上跑的橋接 server(:8765 → CDP :9222);與 gpt-relay 共用。 |

### session 存放路徑(重要,與 gpt-relay 隔離)

`gemini_relay.mjs` 的 `getStatePath()` 決定 session 存哪,優先序:

1. 呼叫時明確帶的 `statePath`
2. `globalThis.__geminiRelayStatePath`
3. `globalThis.nodeRepl.homeDir` → `~/.codex/gemini-relay/sessions.json`(**Codex 路徑**)
4. fallback temp dir

`mcp_server.mjs` 頂端有 portability 守衛:**只有在非 Codex 環境(沒有 `globalThis.nodeRepl`)**
才用 `GEMINI_RELAY_STATE_PATH`(預設 OS temp)設第 2 項。Codex 有 `nodeRepl` → 守衛跳過,
維持第 3 項。

> ⚠️ Gemini 的 store 用 `gemini-relay` 目錄與 `__geminiRelayStatePath` / `GEMINI_RELAY_STATE_PATH`,
> **與 gpt-relay 的 `gpt-relay` / `__gpt55RelayStatePath` / `GPT_RELAY_STATE_PATH` 完全分開**,兩外掛 session 不會互相污染。

### 對話 URL 與續問

- 已登入時,送完第一則後 Gemini 會把網址變成 `https://gemini.google.com/app/<id>`;
  程式輪詢擷取此 URL 存入 session,`continue` / `poll` 靠它重開同一對話。
- 訪客模式拿不到穩定 URL → `conversationUrl` 為空、`guestMode=true`,**不可續問或輪詢**。

---

## 2. Codex 怎麼用

1. 安裝 / 重裝 plugin(marketplace 已含 `gemini-relay`)。
2. 任一目錄開 Codex,composer 輸入 `@` → 選 **Gemini Relay**。
3. 輸入,例如:
   ```text
   請交給 Gemini:分析這個 repo 的測試策略。
   ```

Codex 端環境變數(host-bridge 模式,沿用 gpt-relay 的變數名):

```bash
export GPT_RELAY_BROWSER_PROVIDER=host-bridge
export GPT_RELAY_HOST_BRIDGE_URL=http://192.168.0.72:8765
export GPT_RELAY_HOST_BRIDGE_TOKEN=change-me
```

session 自動存 `~/.codex/gemini-relay/sessions.json`(不需設 `GEMINI_RELAY_STATE_PATH`)。

---

## 3. Claude Code 怎麼用

gemini-relay MCP server 是標準 stdio MCP,Claude Code 直接掛即可,**任何目錄通用**。

### 一次性安裝(user scope = 全域)

```bash
claude mcp add gemini-relay -s user \
  -e GPT_RELAY_BROWSER_PROVIDER=host-bridge \
  -e GPT_RELAY_HOST_BRIDGE_URL=http://192.168.0.72:8765 \
  -e GPT_RELAY_HOST_BRIDGE_TOKEN=change-me \
  -e GEMINI_RELAY_STATE_PATH=$HOME/.codex/gemini-relay/sessions.json \
  -- node /絕對路徑/plugins/gemini-relay/scripts/mcp_server.mjs
```

驗證:

```bash
claude mcp get gemini-relay        # Scope: User、Status: ✔ Connected
```

> 重點:
> - 路徑用**絕對路徑**。
> - host-bridge 連線變數沿用 `GPT_RELAY_*`(與 gpt-relay 同一條橋)。
> - session store 變數是 `GEMINI_RELAY_STATE_PATH`(別跟 `GPT_RELAY_STATE_PATH` 搞混)。
> - `-s user` = 全域;省略則只在當前專案。

### Slash 命令

在 `~/.claude/commands/` 已備妥 4 個 slash(對應四個工具):

| Slash | 工具 | 用法 |
| --- | --- | --- |
| `/gemini <prompt>` | `mcp__gemini-relay__ask` | 新任務 |
| `/gemini-continue <關鍵字> -- <追問>` | `mcp__gemini-relay__continue` | 續問已登入對話 |
| `/gemini-poll <關鍵字>` | `mcp__gemini-relay__poll` | 不送 prompt 重讀 session |
| `/gemini-list [關鍵字]` | `mcp__gemini-relay__list_sessions` | 列出 session |

也可直接用自然語言:`請交給 Gemini:分析這個 repo 的測試策略。`

---

## 4. 共同前提(兩邊都需要)

- 有 Chrome 那台機器:Chrome 以 debug 模式開(`--remote-debugging-port=9222`),
  且 `host-bridge` server 在 :8765 跑著。
- 該 Chrome 的 Gemini 是**已登入**或可互動的**訪客模式**。訪客只可純文字 relay,不能續問或輪詢;
  已登入對話才可使用持久 session。
- 健康檢查:
  ```bash
  curl -H 'Authorization: Bearer change-me' http://192.168.0.72:8765/health
  # → {"ok":true,"cdpUrl":"http://127.0.0.1:9222"}
  ```

## 5. 最小驗證

送 `請只回覆 OK。`。已登入模式預期 `status: complete` + `conversationUrl`(含 `/app/<id>`);
訪客模式預期 `status: complete`,但不會有可續問的 conversation URL。
之後可 `/gemini-list` 看到該筆、`/gemini-continue` 續問驗證 Gemini 記得前文。
