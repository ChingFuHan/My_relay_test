# Docs Index

這個資料夾是給「第一次接手這個 repo 的人」看的入口。

建議閱讀順序：

1. [deployment-modes.md](./deployment-modes.md)
   先判斷你是本機、Host/Guest，還是遠端模式。
2. [new_agent_onboarding.md](./new_agent_onboarding.md)
   給新 agent 的超短入口，先看這份再進細節。
3. [global_codex_setup.md](./global_codex_setup.md)
   如果你要的是「直接套在 Codex 上」，先看這份；它會安裝可由 `@` 選取的 GPT Relay plugin。
4. [new-codex-session.md](./new-codex-session.md)
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
- ChatGPT 登入/訪客/驗證狀態分辨：已加上
- 圖片流程：部分成功，尚未完全穩定
