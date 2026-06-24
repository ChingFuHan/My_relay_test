# Deployment Modes

這份文件說明 `GPT Relay` 與 `host-bridge` 不同的部署方式。

重點先講：

- `host-bridge` 不是 VM 專用
- 它本質上是把「可控制的 Chrome + 已登入的 ChatGPT」包成一個 HTTP bridge
- 任何能連到這個 bridge 的 Codex 執行環境都可以用

## 核心概念

`GPT Relay` 需要三個條件：

1. Codex 端已安裝 `GPT Relay` plugin
2. 某個地方有可被控制的 Chrome，而且已登入 ChatGPT
3. Codex 執行環境可以連到 `host-bridge`

差別只在：

- Chrome 跑在哪裡
- Codex 跑在哪裡
- `GPT_RELAY_HOST_BRIDGE_URL` 要指向哪裡

## Mode 1: Local Mode

適合情境：

- Codex、Chrome、`host-bridge` 都在同一台機器
- 最容易上手

架構：

```text
Codex -> host-bridge -> local Chrome -> ChatGPT
```

典型設定：

```bash
export GPT_RELAY_BROWSER_PROVIDER=host-bridge
export GPT_RELAY_HOST_BRIDGE_URL=http://127.0.0.1:8765
export GPT_RELAY_HOST_BRIDGE_TOKEN=change-me
```

說明：

- `CHROME_CDP_URL` 通常還是 `http://127.0.0.1:9222`
- `host-bridge` 可以只綁 `127.0.0.1`
- 這是安全性最簡單的模式

適用對象：

- 單機使用者
- 沒有 VM / Docker / 遠端機器

## Mode 2: Host/Guest Mode

適合情境：

- Codex 在 VM、Docker、WSL、Dev Container 或其他 guest 環境
- Chrome 與 ChatGPT session 在 host

架構：

```text
Codex in guest -> host-bridge on host -> host Chrome -> ChatGPT
```

典型設定：

```bash
export GPT_RELAY_BROWSER_PROVIDER=host-bridge
export GPT_RELAY_HOST_BRIDGE_URL=http://<host-ip>:8765
export GPT_RELAY_HOST_BRIDGE_TOKEN=change-me
```

常見例子：

- Linux VM -> Windows host
- Docker container -> macOS host
- WSL -> Windows host

說明：

- `host-bridge` 常需要綁 `0.0.0.0`
- guest 端通常要用 host IP、`host.docker.internal`、bridge 網路或 tunnel
- 這是本 repo 目前已實際驗證成功的模式

本次成功案例：

- Linux VM Codex runtime
- Windows host Chrome
- `GPT_RELAY_HOST_BRIDGE_URL=http://192.168.0.72:8765`

Windows host 使用者可在同一 repo 的
[`host-bridge/windows/`](../host-bridge/windows/) 雙擊
`run-gpt-relay-host.bat` 啟動 Chrome 與 bridge；Linux guest 端再依上方環境變數連線。

## Mode 3: Remote Mode

適合情境：

- Codex 在 A 機器
- Chrome / ChatGPT 在 B 機器
- 兩邊不一定是 host/guest 關係，只要網路可達

架構：

```text
Codex on machine A -> host-bridge on machine B -> Chrome on machine B -> ChatGPT
```

典型設定：

```bash
export GPT_RELAY_BROWSER_PROVIDER=host-bridge
export GPT_RELAY_HOST_BRIDGE_URL=http://<remote-host>:8765
export GPT_RELAY_HOST_BRIDGE_TOKEN=change-me
```

常見連線方式：

- 內網固定 IP
- Tailscale / ZeroTier
- SSH tunnel
- reverse proxy

說明：

- 這模式最彈性
- 也最需要你自己處理網路安全與授權

## 三種模式比較

| 模式 | Codex 在哪裡 | Chrome 在哪裡 | `GPT_RELAY_HOST_BRIDGE_URL` 常見值 | 難度 |
| --- | --- | --- | --- | --- |
| Local Mode | 本機 | 本機 | `http://127.0.0.1:8765` | 最低 |
| Host/Guest Mode | guest | host | `http://<host-ip>:8765` | 中 |
| Remote Mode | A 機器 | B 機器 | `http://<remote-host>:8765` | 較高 |

## 何時需要 `host-bridge`

你在以下情況通常需要它：

- Codex 看不到你要用的那個 Chrome
- Codex 不在有 ChatGPT session 的那台機器上
- 你想用已登入、已解鎖 Pro / Deep Research / image generation 的特定 Chrome

你在以下情況不一定需要它：

- Codex 與 Chrome 已在同一個可直接互動的環境
- 你已經有別的穩定 browser provider 路徑

## 環境變數規則

不論哪種模式，Codex 端核心變數都一樣：

```bash
export GPT_RELAY_BROWSER_PROVIDER=host-bridge
export GPT_RELAY_HOST_BRIDGE_URL=http://...
export GPT_RELAY_HOST_BRIDGE_TOKEN=change-me
```

`host-bridge` 端常見變數：

```bash
HOST_BRIDGE_TOKEN=change-me
CHROME_CDP_URL=http://127.0.0.1:9222
HOST_BRIDGE_HOST=127.0.0.1
HOST_BRIDGE_PORT=8765
```

注意：

- Local Mode 常用 `HOST_BRIDGE_HOST=127.0.0.1`
- Host/Guest 或 Remote Mode 常用 `HOST_BRIDGE_HOST=0.0.0.0`

## 安全建議

- 永遠設定 `HOST_BRIDGE_TOKEN`
- 不要直接把 raw CDP port `9222` 暴露給不必要的網段
- 如果不是單機本地模式，優先考慮：
  - SSH tunnel
  - Tailscale
  - 受控內網
- 如果 bridge 要跨機器，請先確認誰能打到 `8765`

## 你應該先看哪份文件

- 想快速跑通：
  - [../user_quick_start.md](../user_quick_start.md)
- 想讓新開的 Codex 自動帶設定：
  - [global_codex_setup.md](./global_codex_setup.md)
- 想看 host-bridge 細節：
  - [../host-bridge/README.md](../host-bridge/README.md)

## 目前已實證 vs 尚未完全驗證

已實證：

- Host/Guest Mode
- Linux VM -> Windows host -> Chrome -> ChatGPT
- 文字 relay end-to-end

尚未完整驗證所有細節：

- Local Mode 的完整文件化 walkthrough
- Remote Mode 的完整文件化 walkthrough
- 圖片流程的最終完成判定
- 部分 continuation / polling 路徑
