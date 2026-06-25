# Global Codex Setup

> 本文是 **Codex** 的全域設定。用 **Claude Code** 的話更簡單,一行 `claude mcp add … -s user` 即全域可用——見 [usage-codex-and-claude-code.md](./usage-codex-and-claude-code.md)(ChatGPT)與 [usage-gemini-codex-and-claude-code.md](./usage-gemini-codex-and-claude-code.md)(Gemini)。

這份文件讓新的 Codex CLI session，不論從哪個 repo 啟動，都能使用已登入或可互動訪客模式的 ChatGPT。
它不會帶著前一個 Codex thread 的對話內容，但會帶著 GPT Relay 的 plugin、bridge 設定，以及已登入對話的 session metadata。

## 一次性安裝

先確認 bridge 機器上的 Chrome debug 與 `host-bridge` 已運作。Windows host 最簡單的方式是執行
`host-bridge/windows/start-all.bat`；細節見 [../host-bridge/README.md](../host-bridge/README.md)。

在 Linux / macOS clone 此 repo 後，只需執行一次：

```bash
bash scripts/install-global-codex-relay.sh \
  --bridge-url http://192.168.0.72:8765 \
  --bridge-token 'change-me'
```

把 URL 與 token 換成你的 bridge 設定。安裝器會：

1. 寫入權限為 600 的 `~/.config/gpt-relay/env.sh`。
2. 讓 `~/.bashrc` 或 `~/.zshrc` 自動載入 bridge 環境變數。
3. 從 `ChingFuHan/My_relay_test` 安裝 `gpt-relay@gpt-relay-host-bridge` plugin，包含它的 MCP relay 工具。

如果 bridge 設定已在環境變數中，也可直接執行安裝器。測試自己的 fork 或本地版本時，從 repo 根目錄加上 `--marketplace-source .`。

## 新 Session 使用方式

開新的 terminal，或先載入設定：

```bash
. ~/.bashrc
cd /任何/其他/repo
codex
```

在 Codex composer 輸入 `@`，從選單選取 **GPT Relay** plugin，再輸入任務。例如：

```text
請交給 ChatGPT 審閱目前 repo 的驗證策略，列出風險與缺漏測試。
```

不要手打 plugin 名稱；使用 `@` 選單來選取它。此入口已在 `codex-cli 0.141.0` 的全新 TUI 實測可見。

本機的 custom prompts 雖然出現在部分文件中，但在此版本沒有註冊成 slash command，因此不要使用 `/prompts:chatgpt`。

## 驗證

在新 terminal：

```bash
env | rg '^GPT_RELAY_'
curl -H "Authorization: Bearer $GPT_RELAY_HOST_BRIDGE_TOKEN" \
  "$GPT_RELAY_HOST_BRIDGE_URL/health"
codex plugin list | rg 'gpt-relay'
```

然後在新的 Codex thread 中用 `@` 選取 **GPT Relay**，並要求 ChatGPT「請只回覆 OK。」。
這會驗證 plugin、環境傳遞、bridge、Chrome CDP，以及 ChatGPT 的訪客或登入狀態。

## 什麼會帶著走

會帶著走：

- 已安裝的 plugin 與 skills。
- 新 shell 啟動 Codex 時的 bridge 環境變數。
- 已登入對話在 `~/.codex/gpt-relay/sessions.json` 中可供續問或 polling 的 metadata。

不會帶著走：

- 前一個 Codex thread 的聊天內容。
- 已結束的 `host-bridge`。
- 已登出的訪客對話內容與訪客對話的續問能力。

## 更新

```bash
codex plugin marketplace upgrade gpt-relay-host-bridge
codex plugin add gpt-relay@gpt-relay-host-bridge
```

更新後重新啟動 Codex 並開新 thread。MCP relay 會安全讀取
`~/.config/gpt-relay/env.sh`，因此從桌面 GUI / IDE 啟動時，不必依賴它繼承 shell 環境變數。
