# Global Codex Setup

這份文件解決的是：在任何目錄啟動新的 Codex CLI session，仍然能用明確命令把工作交給
ChatGPT。它不會帶著舊 conversation 的聊天記憶，但會帶著「可呼叫 ChatGPT」的能力。

## 一次性安裝

先確認 bridge 所在機器的 Chrome debug 與 `host-bridge` 已正常運作。Windows host 的最懶
啟動方式是 `host-bridge/windows/start-all.bat`；細節看
[../host-bridge/README.md](../host-bridge/README.md)。

在 Linux / macOS 上 clone 此 repo 後，只需執行一次：

```bash
bash scripts/install-global-codex-relay.sh \
  --bridge-url http://192.168.0.72:8765 \
  --bridge-token 'change-me'
```

將 URL 與 token 換成你的實際 bridge 設定。安裝器會：

1. 寫入 `~/.config/gpt-relay/env.sh`，權限為僅目前使用者可讀。
2. 讓 `~/.bashrc` 或 `~/.zshrc` 自動載入 bridge 環境變數。
3. 從 `ChingFuHan/My_relay_test` 安裝 `gpt-relay@gpt-relay-host-bridge` plugin。
4. 安裝實體 Codex custom prompts 到 `~/.codex/prompts/`。

如果 bridge 已透過環境變數設定，也可不傳 URL/token：

```bash
export GPT_RELAY_HOST_BRIDGE_URL=http://192.168.0.72:8765
export GPT_RELAY_HOST_BRIDGE_TOKEN='change-me'
bash scripts/install-global-codex-relay.sh
```

若你是在自己 fork 或本地 checkout 測試，改用來源覆寫：

```bash
bash scripts/install-global-codex-relay.sh \
  --bridge-url http://192.168.0.72:8765 \
  --bridge-token 'change-me' \
  --marketplace-source .
```

`--marketplace-source .` 只能在此 repo 根目錄執行。

## 新 Session 怎麼用

**先完全離開已在跑的 Codex CLI**：輸入 `/exit`，回到 shell prompt。`/new`、切換 Plan mode，
或開同一個 process 的新 thread 都不會重新掃描 custom prompts。

再關掉並重新開啟 terminal，或先執行：

```bash
. ~/.bashrc
```

接著可在任何目錄啟動一個新的 Codex process：

```bash
cd /任何/其他/repo
codex
```

在 Codex composer 輸入 `/`，可看到下列真正的 slash command：

- `/prompts:chatgpt <任務>`：新開 ChatGPT relay。
- `/prompts:gpt <任務>`：短別名。
- `/prompts:chatgpt-continue query=<主題或 session id> :: <續問>`：延續對話。
- `/prompts:chatgpt-poll query=<主題或 session id>`：查詢進行中的工作。

例如：

```text
/prompts:chatgpt 請審閱目前 repo 的驗證策略，列出風險與缺漏測試。
```

也可直接在一般語句中指定 `@gpt-relay`，或用 `/chatgpt ...`、`/gpt ...`。後兩者是
plugin skill 的路由前綴；真正由 Codex slash 選單提供的是 `/prompts:*` 命令。

## 驗證

新 terminal 中先驗證環境與 bridge：

```bash
env | rg '^GPT_RELAY_'
curl -H "Authorization: Bearer $GPT_RELAY_HOST_BRIDGE_TOKEN" \
  "$GPT_RELAY_HOST_BRIDGE_URL/health"
codex plugin list | rg 'gpt-relay'
ls ~/.codex/prompts/chatgpt.md
```

最後在新的 Codex thread 執行：

```text
/prompts:chatgpt 請只回覆 OK。
```

這會驗證 plugin 載入、環境傳遞、bridge、Chrome CDP，以及 ChatGPT 登入狀態。

## 什麼會帶著走

會帶著走：

- 已安裝的 plugin 與 skills。
- `~/.codex/prompts/` 中的 `/prompts:*` 命令。
- 新 shell 啟動 Codex 時的 bridge 環境變數。
- `~/.codex/gpt-relay/sessions.json` 中可供續問或 polling 的 metadata。

不會帶著走：

- 前一個 Codex thread 的聊天上下文。
- 已結束或中斷的 `host-bridge`。
- 已登出的 ChatGPT Chrome session。

## 更新與修復

更新 plugin 與重裝 slash prompts：

```bash
codex plugin marketplace upgrade gpt-relay-host-bridge
codex plugin add gpt-relay@gpt-relay-host-bridge
bash /path/to/GPT-Relay-Codex-Plugin-/scripts/install-global-codex-relay.sh \
  --force-prompts --skip-plugin
```

每次 plugin 或 prompts 更新後，都要 `/exit` 後重新執行 `codex`，不能只開新的 Codex thread。

若 Codex 是從桌面 GUI / IDE 啟動，不一定會讀到 `.bashrc`。本流程已驗證的是從新 terminal
啟動的 Codex CLI；GUI 使用前先確認它的 process environment 也有三個 `GPT_RELAY_*` 變數。
