# New Codex Session With ChatGPT

目標：在別的 repo 或空目錄執行 `codex`，仍可把問題送到已登入的 ChatGPT。

前提只有三個：

1. Chrome debug 與 `host-bridge` 正在 bridge 機器上運作。
2. 已完成一次 [global_codex_setup.md](./global_codex_setup.md) 的安裝。
3. 用新的 terminal 開啟 Codex CLI，讓 shell 載入 `~/.config/gpt-relay/env.sh`。

使用：

```bash
cd /any/other/repository
codex
```

在 Codex 中輸入：

```text
/prompts:chatgpt 請分析這個 repo 的測試策略。
```

或直接選取 `@gpt-relay` skill 後描述任務。

如果 slash 選單沒看到 `/prompts:chatgpt`，先確認：

```bash
ls ~/.codex/prompts/chatgpt.md
```

若檔案不存在，重新跑：

```bash
bash /path/to/GPT-Relay-Codex-Plugin-/scripts/install-global-codex-relay.sh --skip-plugin
```

如果命令存在但 relay 失敗，依序檢查 bridge health、ChatGPT 是否已登入、再開一個新的
Codex thread。不要重送長任務；先用 `/prompts:chatgpt-poll` 查詢既有 session。
