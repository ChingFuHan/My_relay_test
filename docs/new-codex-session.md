# New Codex Session With ChatGPT

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
3. 啟動 Codex 的 shell 已載入 `~/.config/gpt-relay/env.sh`。

若 relay 失敗，先檢查 bridge health 與 ChatGPT 登入狀態。長任務不要重送，請在選取 GPT Relay 後要求它查詢既有 session 或 polling。
