# GPT Relay & Gemini Relay — Codex 與 Claude Code 雙平台

[English README](./README.md) | [English details](./README.en.md)

這個 repo 有兩個瀏覽器 relay 外掛：

- `GPT Relay`：接 **ChatGPT**。
- `Gemini Relay`：接 **Gemini**。

兩個 relay 都是標準 **stdio MCP server**,所以**同一支外掛在 Codex 和 Claude Code 都能用**,任何目錄通用。兩者都提供相同的四個工具:`ask`(新問題)、`continue`(續問已登入對話)、`poll`(不送新 prompt 重讀對話)、`list_sessions`(列出對話)。

運作方式:relay 用 Chrome 中已登入或可互動訪客的聊天頁,把問題送出、等畫面回答完成、再把完整回覆帶回你的 agent;在帳號支援時,也帶回圖片、Deep Research 報告(ChatGPT)與可續問的對話連結。

> Codex 從外掛 marketplace 安裝;Claude Code 用 `claude mcp add` 註冊(見[在 Claude Code 使用](#在-claude-code-使用))。
> 這是 Prompt Case 製作的社群專案,不是 OpenAI、ChatGPT 或 Google 官方產品。

## 示範

### Codex 安裝畫面

![GPT Relay 安裝畫面](./media/plugin-install-screen.png)

### Codex 和 ChatGPT 並排操作示範

下面示範展示 Codex 呼叫 GPT Relay，Chrome 同步打開 ChatGPT，選擇指定模型 / 思考模式 / 思考強度，送出 prompt，最後把結果帶回 Codex。

![GPT Relay 示範](./media/gpt-relay-demo.gif)

## 在 Codex 安裝

### 方法 A：用 Codex 介面安裝

在 Codex 打開 **Plugins** → **Manage** → **Create** → **Add marketplace**，然後填入：

| 欄位 | 填寫內容 |
| --- | --- |
| Source | `ChingFuHan/My_relay_test` |
| Git ref | `main` |
| Sparse paths | 一般情況留空即可。如果你的 Codex 版本要求 sparse checkout，可以填 `.agents/plugins`、`plugins/gpt-relay`、`plugins/gemini-relay`。 |

加入 marketplace 後，安裝 **GPT Relay** 或 **Gemini Relay**，然後開一個新的 Codex thread。

### 方法 B：用 CLI 加入 Marketplace

在 Codex 環境執行：

```bash
codex plugin marketplace add ChingFuHan/My_relay_test --ref main
codex plugin add gpt-relay@gpt-relay-host-bridge
codex plugin add gemini-relay@gpt-relay-host-bridge
```

然後在 Codex Plugins 介面安裝 **GPT Relay** 或 **Gemini Relay**，再開一個新的 Codex thread，讓 Codex 載入新的插件 skill。

## 在 Claude Code 使用

Claude Code 不走 Codex marketplace、也不需要 Codex Chrome 插件,而是把 relay 當成標準 stdio MCP server,經 `host-bridge` 連線。一次性以 user scope 註冊,之後任何目錄都能用。

先確認 host bridge 已啟動(見 [Host-Bridge 部署模式](#host-bridge-部署模式)),再註冊一或兩個 relay:

```bash
# ChatGPT relay
claude mcp add gpt-relay -s user \
  -e GPT_RELAY_BROWSER_PROVIDER=host-bridge \
  -e GPT_RELAY_HOST_BRIDGE_URL=http://192.168.0.72:8765 \
  -e GPT_RELAY_HOST_BRIDGE_TOKEN=change-me \
  -e GPT_RELAY_STATE_PATH="$HOME/.codex/gpt-relay/sessions.json" \
  -- node /絕對路徑/plugins/gpt-relay/scripts/mcp_server.mjs

# Gemini relay
claude mcp add gemini-relay -s user \
  -e GPT_RELAY_BROWSER_PROVIDER=host-bridge \
  -e GPT_RELAY_HOST_BRIDGE_URL=http://192.168.0.72:8765 \
  -e GPT_RELAY_HOST_BRIDGE_TOKEN=change-me \
  -e GEMINI_RELAY_STATE_PATH="$HOME/.codex/gemini-relay/sessions.json" \
  -- node /絕對路徑/plugins/gemini-relay/scripts/mcp_server.mjs
```

用 `claude mcp get gpt-relay` / `claude mcp get gemini-relay` 確認 Status 是 ✔ Connected。`mcp_server.mjs` 要用**絕對路徑**;若 Claude Code 與 Chrome 在同一台,host-bridge URL 用 `http://127.0.0.1:8765`。

註冊後即可用 `ask` / `continue` / `poll` / `list_sessions` 四個工具。本 repo 也在 [`.claude/commands/`](./.claude/commands/) 附了 slash 命令:`/chatgpt`、`/chatgpt-continue`、`/chatgpt-poll`、`/chatgpt-list` 與 `/gemini`、`/gemini-continue`、`/gemini-poll`、`/gemini-list`。在 repo 內開 Claude Code 會自動載入;要全域用就 `cp .claude/commands/*.md ~/.claude/commands/`。

**Codex 也有同樣的 slash**:以 skills 形式放在 [`codex/skills/`](./codex/skills/),由 `scripts/install-global-codex-relay.sh` 裝到 `~/.codex/skills/`(裝完重開 Codex TUI)。Codex 會把 `~/.codex/skills/<name>/SKILL.md` 變成 `/<name>` 命令(與 `/caveman` 同機制)。它們會**強制走 web、不本地作答**。詳見 [`codex/skills/README.md`](./codex/skills/README.md)。

完整教學:[docs/usage-codex-and-claude-code.md](./docs/usage-codex-and-claude-code.md)(ChatGPT)與 [docs/usage-gemini-codex-and-claude-code.md](./docs/usage-gemini-codex-and-claude-code.md)(Gemini)。

## Chrome 設定

直接操作 Chrome 的路徑需要官方 Codex Chrome 插件；`host-bridge` 路徑則透過 Chrome CDP，
一般文字 relay 不需要該插件。

### 安裝 Codex Chrome 插件

請先到 Chrome Web Store 安裝官方 Codex 插件：

[Chrome Web Store 上的 Codex 插件](https://chromewebstore.google.com/detail/codex/hehggadaopoacecdllhhajmbjkdcmajg)

![Chrome Web Store 上的 Codex 插件](./media/chrome-web-store-codex-extension.png)

### 開啟本機檔案上傳權限

如果你想讓 GPT Relay 控制 ChatGPT 上傳本機圖片或文件，需要替 Codex Chrome 插件開啟 file URL 權限：

1. 打開 Chrome **Manage Extensions**。
2. 找到 Codex 插件，點擊 **Details**。
3. 開啟 **Allow access to file URLs**。

![替 Codex Chrome 插件開啟 Allow access to file URLs](./media/chrome-extension-file-urls.png)

## 使用前需要

- Codex 支援插件功能。
- 已安裝官方 Codex Chrome 插件，或已完成本 repo 的 `host-bridge` 設定。
- Chrome 中有可互動的 ChatGPT 訪客頁，或已登入 ChatGPT。
- 如果要上傳本機附件，請開啟 **Allow access to file URLs**。
- 你的 ChatGPT 帳號本身要有你要求的模型或模式。比如 Pro 模式需要 ChatGPT Pro 帳號。

## ChatGPT 存取模式

| 模式 | 可用 relay | 不可用功能 |
| --- | --- | --- |
| **訪客**（未登入） | 純文字 prompt 與回覆；若 ChatGPT 顯示「保持登出狀態」，GPT Relay 會維持訪客模式。 | 帳號限定模型、附件、圖片生成、Deep Research、穩定的對話連結、續問與 polling。 |
| **已登入** | 該 ChatGPT 帳號畫面上可用的功能，包括可持久化的對話與帳號限定模型。 | 帳號未開通的功能，以及 host-bridge 尚未完整驗證的流程。 |

訪客模式目前已驗證 Windows 本機 host-bridge 的純文字 relay。已登入模式的附件、圖片、Deep Research 與部分續問，在 host-bridge 下仍屬部分驗證。

## Gemini 存取模式

`Gemini Relay` 是透過 Gemini 網頁 UI 的純文字 relay,提供與 GPT Relay 相同的 `ask` / `continue` / `poll` / `list_sessions` 四個工具,並有 session 儲存:

| 狀態 | 可用 | 不可用 |
| --- | --- | --- |
| **訪客**（未登入） | 若 Gemini 有可互動的未登入 composer，可送純文字 prompt 與拿回回覆。 | 模型切換、附件、圖片;且因為沒有穩定對話 URL,**不能續問或 polling**。 |
| **已登入** | 純文字 prompt 與回覆;會擷取對話 URL(`gemini.google.com/app/<id>`)並存檔,所以可以**續問、polling、列出**。 | 模型切換、附件、圖片生成。 |
| **阻擋中** | 不 relay。 | 直接回登入或驗證錯誤，不會替你按登入。 |

## Host-Bridge 部署模式

如果 Codex 不能直接使用有 ChatGPT 的 Chrome session（已登入或可互動訪客），可以改走 `host-bridge`。

常見情境：

- Codex 與 Chrome 在同一台機器
- Codex 在 VM、Docker、WSL 或 dev container
- Codex 與 Chrome 在不同機器

先看：

- [docs/deployment-modes.md](./docs/deployment-modes.md)
- [docs/global_codex_setup.md](./docs/global_codex_setup.md)
- [user_quick_start.md](./user_quick_start.md)

## 每個 Codex Session 都可用

在 Linux / macOS 執行一次：

```bash
bash scripts/install-global-codex-relay.sh \
  --bridge-url http://192.168.0.72:8765 \
  --bridge-token 'change-me'
```

之後重新開 terminal，在任何目錄啟動新的 Codex thread，在 composer 輸入 `@` 並選取
**GPT Relay** 或 **Gemini Relay**，再輸入：

```text
請交給 ChatGPT：<任務>
```

完整設定看 [docs/global_codex_setup.md](./docs/global_codex_setup.md)，日常使用看
[docs/new-codex-session.md](./docs/new-codex-session.md)。

## Marketplace 需要什麼

這個 repo 已經整理成 Codex 可以加入的 plugin marketplace。Codex 需要看到：

- repo 根目錄有 `.agents/plugins/marketplace.json`
- 插件 manifest 在 `plugins/gpt-relay/.codex-plugin/plugin.json` 與 `plugins/gemini-relay/.codex-plugin/plugin.json`
- 插件本體在 `plugins/gpt-relay` 與 `plugins/gemini-relay`
- Git ref 通常填 `main`

你截圖裡的 **Add marketplace** 是把這個 GitHub repo 加成自訂 marketplace 來源；它和「提交到 OpenAI 官方內建商店」不是同一件事。

## 支援能力

- 如果你沒有指定更換模型，會保留你 ChatGPT 原本的模型設定。
- 如果你指定模型，會嘗試切換到可見的 ChatGPT Intelligence 選項，例如 `5.5 Pro Extended` 或 `5.4 Thinking Light`。
- 如果你的帳號看不到某個模型或模式，插件會明確告訴你，而不是偷偷改用其他模型。
- 可以把 prompt 和支援的附件傳給 ChatGPT。
- 回傳文字會盡量保留 ChatGPT 原本格式，包括標題、列表、表格、連結和程式碼。
- 圖片生成任務會回傳圖片 artifact。
- Deep Research 任務會匯出 Markdown 報告 artifact。
- 已登入對話會保存 session 資料，方便繼續對話或輪詢長時間任務。

## 常用例子

```text
Use GPT 5.5 Pro Extended to analyze this question: ...
```

```text
Run Deep Research on this topic: ...
```

```text
Switch to GPT 5.4 Thinking Light and analyze this image.
```

## 更新插件

之後如果這個 GitHub repo 有更新，可以執行：

```bash
codex plugin marketplace upgrade gpt-relay-host-bridge
```

然後在 Codex Plugins 介面更新或重新安裝 **GPT Relay** 或 **Gemini Relay**。更新後同樣建議開一個新的 Codex thread。

## 注意事項

- GPT Relay 是透過 ChatGPT 網頁 UI 操作。如果 ChatGPT 改版，插件可能需要更新 selector。
- 插件只會報告 ChatGPT 畫面上可見和已選中的模型 / 模式 / 強度，不會聲稱知道背後隱藏狀態。
- 訪客純文字 relay 遇到「保持登出狀態」會維持訪客模式；其他登入、CAPTCHA、權限彈窗，或者帳號沒有相關模型時，插件會停止並回報原因。
