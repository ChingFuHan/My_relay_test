# Docs Index

這個資料夾是給「第一次接手這個 repo 的人」看的入口。本 repo 有兩個 relay(ChatGPT 用 GPT Relay、Gemini 用 Gemini Relay),**Codex 與 Claude Code 都能用**。

> **最重要的兩份雙平台主指南(先看這個):**
> - [usage-codex-and-claude-code.md](./usage-codex-and-claude-code.md) — GPT Relay 在 Codex 與 Claude Code 怎麼用。
> - [usage-gemini-codex-and-claude-code.md](./usage-gemini-codex-and-claude-code.md) — Gemini Relay 在 Codex 與 Claude Code 怎麼用。

建議閱讀順序：

1. [deployment-modes.md](./deployment-modes.md)
   先判斷你是本機、Host/Guest，還是遠端模式。
2. [new_agent_onboarding.md](./new_agent_onboarding.md)
   給新 agent 的超短入口，先看這份再進細節。
3. **雙平台用法**:[usage-codex-and-claude-code.md](./usage-codex-and-claude-code.md)(ChatGPT)、[usage-gemini-codex-and-claude-code.md](./usage-gemini-codex-and-claude-code.md)(Gemini)。Claude Code 用 `claude mcp add` 一次設定即全域可用。
4. [global_codex_setup.md](./global_codex_setup.md)
   只用 Codex 時的全域安裝;它會安裝可由 `@` 選取的 GPT Relay 與 Gemini Relay plugin。
5. [new-codex-session.md](./new-codex-session.md)
   已安裝後，換到別的 repo 開新 Codex session 時怎麼使用。
5. [../user_quick_start.md](../user_quick_start.md)
   目前已驗證的最短流程，對應 Windows host + Linux VM 範例。
6. [agent_handoff_2026-06-24.md](./agent_handoff_2026-06-24.md)
   這次實作到底改了什麼、驗證到哪裡、還有哪些限制。
7. [../AGENTS.md](../AGENTS.md)
   給下一個 agent 的專案記憶與關鍵路徑。

如果你只想確認目前是否已經可用：

- 文字 relay：已驗證可用
- host-bridge 連線：已驗證可用
- ChatGPT 訪客／已登入／驗證狀態分辨：已加上；訪客純文字 relay 已驗證，訪客不支援續問或 polling
- 圖片流程：部分成功，尚未完全穩定
