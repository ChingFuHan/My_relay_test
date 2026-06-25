# New Codex Session With ChatGPT

> 本文針對 **Codex**。**Claude Code** 不需每次設定,`claude mcp add … -s user` 註冊一次後任何目錄都能用 `ask`/`continue`/`poll`/`list_sessions` 或 `/chatgpt`、`/gemini` slash——見 [usage-codex-and-claude-code.md](./usage-codex-and-claude-code.md)。

在任何 repo 中使用：

```bash
cd /any/other/repository
codex
```

Codex composer 中輸入 `@`，選取 **GPT Relay** plugin，然後輸入：

```text
請交給 ChatGPT 分析這個 repo 的測試策略。
```

此能力需要：

1. Chrome debug 與 `host-bridge` 仍在 bridge 機器上運作。
2. 已完成 [global_codex_setup.md](./global_codex_setup.md) 的一次性安裝。
3. `~/.config/gpt-relay/env.sh` 仍存在且 bridge URL/token 正確。GPT Relay MCP server 會自行讀取它，即使新 Codex process 沒有繼承 shell 環境變數。

若 relay 失敗，先檢查 bridge health 與 ChatGPT 存取狀態。訪客模式只支援純文字且不可續問；只有已登入的長任務才可要求它查詢既有 session 或 polling，且不要重送。
