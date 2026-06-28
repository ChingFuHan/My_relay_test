# GPT Relay 使用指南:Codex 與 Claude Code

> 一份就懂:這個 repo 在做什麼、Codex 怎麼用、Claude Code 怎麼用。
> 新接手的人或 agent 先讀這份。

## 1. 這個 repo 是什麼(知識傳承)

**GPT Relay** 讓 AI coding agent(Codex 或 Claude Code)把提問轉給**網頁版 ChatGPT**,
再把 ChatGPT 的回答、生成圖片、Deep Research 報告、對話連結帶回 agent。

資料流:

```
Agent (Codex / Claude Code)
  → gpt-relay MCP server (stdio, JSON-RPC)
  → host-bridge HTTP :8765   ← 在「有 Chrome 的那台機器」上跑
  → Chrome CDP :9222
  → 網頁版 ChatGPT
  → 原路帶回
```

### 核心檔案

| 檔案 | 角色 |
| --- | --- |
| `plugins/gpt-relay/scripts/mcp_server.mjs` | 可攜的 stdio MCP server。工具:`ask` / `continue` / `poll` / `list_sessions`。Codex 與 Claude Code **共用同一支**。 |
| `plugins/gpt-relay/scripts/chatgpt_relay.mjs` | relay 主程式(開分頁、選模型、送 prompt、判斷完成、存 session)。 |
| `plugins/gpt-relay/scripts/adapters/host_bridge_adapter.mjs` | `host-bridge` provider:把 Playwright 操作轉成對 :8765 的 HTTP 呼叫。 |
| `host-bridge/server.mjs` | 在有 Chrome 那台機器上跑的橋接 server(:8765 → CDP :9222)。 |

### ⚠️ 別搞混兩條橋

- **:8765 = 本 repo 的 `host-bridge`**(CDP proxy)。**這個才是 GPT Relay 用的。**
- **:8787 = `~/work/web_bridge`**,是另一個獨立的個人工具(Firefox extension 版),
  跟本 repo 無關。**不要混用。**

### session 存放路徑(重要)

`chatgpt_relay.mjs` 的 `getStatePath()` 決定 session 存哪,優先序:

1. 呼叫時明確帶的 `statePath`
2. `globalThis.__gpt55RelayStatePath`
3. `globalThis.nodeRepl.homeDir` → `~/.codex/gpt-relay/sessions.json`(**Codex 路徑**)
4. fallback temp dir

`mcp_server.mjs` 頂端有 portability 守衛:**只有在非 Codex 環境(沒有 `globalThis.nodeRepl`)**
才用 `GPT_RELAY_STATE_PATH`(預設 OS temp)設第 2 項。Codex 有 `nodeRepl` → 守衛跳過,
維持第 3 項。**這保證 Claude Code 整合不影響 Codex 的 session 路徑。**

---

## 2. Codex 怎麼用

1. 安裝 plugin(見 [../README.md](../README.md) 的 marketplace 安裝;一次性設定見
   [global_codex_setup.md](./global_codex_setup.md))。
2. 任一目錄開 Codex,composer 輸入 `@` → 選 **GPT Relay**。
3. 輸入,例如:
   ```text
   請交給 ChatGPT:分析這個 repo 的測試策略。
   ```
4. 換 repo / 新 session 仍可用,見 [new-codex-session.md](./new-codex-session.md)。

Codex 端環境變數(host-bridge 模式):

```bash
export GPT_RELAY_BROWSER_PROVIDER=host-bridge
export GPT_RELAY_HOST_BRIDGE_URL=http://192.168.0.72:8765
export GPT_RELAY_HOST_BRIDGE_TOKEN=change-me
```

session 自動存 `~/.codex/gpt-relay/sessions.json`(不需設 `GPT_RELAY_STATE_PATH`)。

### Slash 命令(Codex)

`scripts/install-global-codex-relay.sh` 會把 `codex/skills/*` 裝到 `~/.codex/skills/`(Codex 把
`~/.codex/skills/<name>/SKILL.md` 變成 `/<name>`,與 `/caveman` 同機制),新開 Codex TUI 後即有四個
slash(**強制走 web ChatGPT、不本地作答**):

| Slash | 工具(Codex 底線式) | 用法 |
| --- | --- | --- |
| `/chatgpt <prompt>` | `mcp__gpt_relay__ask` | 新問題 |
| `/chatgpt-continue <id> -- <追問>` | `mcp__gpt_relay__continue` | 續問已登入對話 |
| `/chatgpt-poll <id>` | `mcp__gpt_relay__poll` | 不送新 prompt 重讀 |
| `/chatgpt-list [關鍵字]` | `mcp__gpt_relay__list_sessions` | 列出 session |

> slash 以 skills 形式在 TUI 啟動時載入,裝完要**重開** Codex。(`~/.codex/prompts/` 不是 slash 來源;
> 舊的 `/prompts:chatgpt` 命名式已淘汰。)若某版仍不顯示 slash,改用 `@` 選 GPT Relay。

---

## 3. Claude Code 怎麼用

gpt-relay MCP server 是標準 stdio MCP,Claude Code 直接掛即可,**任何目錄通用**。

### 一次性安裝(user scope = 全域)

```bash
claude mcp add gpt-relay -s user \
  -e GPT_RELAY_BROWSER_PROVIDER=host-bridge \
  -e GPT_RELAY_HOST_BRIDGE_URL=http://192.168.0.72:8765 \
  -e GPT_RELAY_HOST_BRIDGE_TOKEN=change-me \
  -e GPT_RELAY_STATE_PATH=/home/xiaohan/.codex/gpt-relay/sessions.json \
  -- node /home/xiaohan/git_other/GPT-Relay-Codex-Plugin-/plugins/gpt-relay/scripts/mcp_server.mjs
```

驗證:

```bash
claude mcp get gpt-relay        # Scope: User、Status: ✔ Connected
```

> 重點:
> - 路徑用**絕對路徑**(Claude Code 沒有 Codex 的 plugin 安裝目錄那層)。
> - `-s user` = 全域;省略則只在當前專案(local scope)。
> - `GPT_RELAY_STATE_PATH` 指向 `~/.codex/gpt-relay/sessions.json` 可與 Codex 共用歷史紀錄;
>   不設則落在 OS temp。
> - 若 `claude mcp ...` 報 `Permission denied`,是 sandbox 擋執行,改用免 sandbox 方式跑該指令。

### 使用

在**任一資料夾**開新的 Claude Code session(MCP 在 session 啟動時載入),
工具 `ask` / `continue` / `poll` / `list_sessions` 即可用。直接說:

```text
請交給 ChatGPT:分析這個 repo 的測試策略。
```

---

## 4. 共同前提(兩邊都需要)

- 有 Chrome 那台機器:Chrome 以 debug 模式開(`--remote-debugging-port=9222`),
  且 `host-bridge` server 在 :8765 跑著。
- 該 Chrome 的 ChatGPT 是**已登入**或可互動的**訪客模式**。訪客只可做純文字 relay，不能續問或 polling；已登入對話才可使用持久 session。
- 健康檢查:
  ```bash
  curl -H 'Authorization: Bearer change-me' http://192.168.0.72:8765/health
  # → {"ok":true,"cdpUrl":"http://127.0.0.1:9222"}
  ```

## 5. 最小驗證

送 `請只回覆 OK。`。已登入模式預期 `status: complete` + `conversationUrl`；訪客模式預期 `status: complete`，但不會有可續問的 conversation URL。
Windows host + Linux VM 的完整已驗證流程見 [../user_quick_start.md](../user_quick_start.md)。
