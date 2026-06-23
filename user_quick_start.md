# GPT Relay Host-Bridge Quick Start

這份文件只寫「目前這次成功跑通」所需的最短流程。

注意：

- 這不是唯一部署方式
- 這份文件記錄的是「Windows host + Linux VM」這條已驗證案例
- 如果你的場景不是 VM，先看 [docs/deployment-modes.md](./docs/deployment-modes.md)

這份文件的目標：

- Linux VM 裡跑 Codex / GPT Relay
- Windows host 跑 Chrome
- Linux VM 經由 `host-bridge` 控制 Windows Chrome 上的 ChatGPT

---

## 1. 架構

- `plugin`: `plugins/gpt-relay`
- `skill`: `plugins/gpt-relay/skills/gpt-relay/SKILL.md`
- `host-bridge`: bridge 機器上的小服務，這次範例是 Windows host，讓 VM 可透過 HTTP 控制 host Chrome

不是只裝 skill 就會通。
真正做事的是 plugin + host-bridge。

---

## 2. Windows Host 要準備什麼

### 2.1 必要條件

- 已安裝 Google Chrome
- 已安裝 Node.js
- Windows 上有 repo，至少有 `host-bridge/`
- ChatGPT 可正常登入

確認 Node.js：

```powershell
node -v
npm -v
```

---

## 3. Windows Host 啟動 Chrome

### 3.1 重點

一定要用 remote debugging 模式啟動 Chrome，讓 bridge 可以控制它。

先把所有 Chrome 關掉：

```powershell
taskkill /f /im chrome.exe /T
Start-Sleep -Seconds 2
```

### 3.2 準備啟動批次檔

不要手打長指令，最穩是用 `.bat`。

```powershell
$bat = "$env:TEMP\start-chrome-debug.bat"
$lines = @(
  '@echo off'
  'set CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe'
  'set PROFILE=%TEMP%\gpt-relay-chrome'
  'start "" "%CHROME%" ^'
  '  --remote-debugging-address=127.0.0.1 ^'
  '  --remote-debugging-port=9222 ^'
  '  --user-data-dir="%PROFILE%"'
)
Set-Content $bat $lines -Encoding ASCII
Get-Content $bat
cmd /c $bat
```

### 3.3 驗證 Chrome 真的起來

```powershell
Get-CimInstance Win32_Process -Filter "name = 'chrome.exe'" | Format-List CommandLine
netstat -ano | findstr 9222
Invoke-WebRequest 'http://127.0.0.1:9222/json/version' | Select-Object -ExpandProperty Content
```

成功條件：

- 主程序命令列有 `--remote-debugging-port=9222`
- `netstat` 有 `127.0.0.1:9222 ... LISTENING`
- `json/version` 有回 JSON

### 3.4 在這個 Chrome 裡登入 ChatGPT

用剛開的這個 Chrome：

- 打開 `https://chatgpt.com`
- 登入 ChatGPT
- 確認已進到正常聊天主畫面
- 這個 Chrome 不要關

---

## 4. Windows Host 啟動 host-bridge

假設 Windows repo 在：

```text
C:\Users\User\Documents\GPT-Relay-Codex-Plugin-
```

進入：

```powershell
cd C:\Users\User\Documents\GPT-Relay-Codex-Plugin-\host-bridge
npm install
```

啟動：

```powershell
$env:HOST_BRIDGE_TOKEN='change-me'
$env:CHROME_CDP_URL='http://127.0.0.1:9222'
$env:HOST_BRIDGE_HOST='0.0.0.0'
node .\server.mjs
```

成功時會看到：

```text
gpt-relay host bridge listening on http://0.0.0.0:8765
```

這個 PowerShell 視窗不要關。

### 4.1 在 Windows host 自己驗證 bridge

```powershell
Invoke-WebRequest 'http://127.0.0.1:8765/health' -Headers @{ Authorization = 'Bearer change-me' } | Select-Object -ExpandProperty Content
```

成功會回：

```json
{"ok":true,"cdpUrl":"http://127.0.0.1:9222"}
```

---

## 5. Linux VM 要準備什麼

這一節只適用於本文件的「Linux VM -> Windows host」範例。

### 5.1 確認 VM 能連到 Windows host

先查 Windows host IP。
本次成功案例是：

```text
192.168.0.72
```

在 Linux VM 驗證：

```bash
rtk curl -H 'Authorization: Bearer change-me' http://192.168.0.72:8765/health
```

成功會回：

```json
{"ok":true,"cdpUrl":"http://127.0.0.1:9222"}
```

如果不通，通常是：

- Windows `host-bridge` 沒跑
- Windows 防火牆擋住 `8765`
- `HOST_BRIDGE_HOST` 不是 `0.0.0.0`

### 5.2 設定 VM 環境變數

```bash
export GPT_RELAY_BROWSER_PROVIDER=host-bridge
export GPT_RELAY_HOST_BRIDGE_URL=http://192.168.0.72:8765
export GPT_RELAY_HOST_BRIDGE_TOKEN=change-me
```

---

## 6. 成功測試過的最小指令

這條是目前成功打通的最小測試。

在 Linux VM repo 根目錄：

```bash
mkdir -p /tmp/gpt-relay
export GPT_RELAY_BROWSER_PROVIDER=host-bridge
export GPT_RELAY_HOST_BRIDGE_URL=http://192.168.0.72:8765
export GPT_RELAY_HOST_BRIDGE_TOKEN=change-me

node --input-type=module <<'EOF'
import { runExtendedProRelay } from "./plugins/gpt-relay/scripts/chatgpt_relay.mjs";

const result = await runExtendedProRelay({
  prompt: "請只回覆 OK。",
  keepTab: true,
  timeoutMs: 180000,
  waitChunkMs: 30000,
  statePath: "/tmp/gpt-relay/sessions.json",
});

console.log(JSON.stringify({
  status: result.status,
  conversationUrl: result.conversationUrl,
  finalDeliveryText: result.finalDeliveryText,
  finalResponseText: result.finalResponseText,
}, null, 2));
EOF
```

本次成功結果：

```json
{
  "status": "complete",
  "conversationUrl": "https://chatgpt.com/c/6a3ab3c1-1bb4-83ee-9546-e53713fd9047",
  "finalDeliveryText": "OK\n\nConversation URL: https://chatgpt.com/c/6a3ab3c1-1bb4-83ee-9546-e53713fd9047",
  "finalResponseText": "OK\n\nConversation URL: https://chatgpt.com/c/6a3ab3c1-1bb4-83ee-9546-e53713fd9047"
}
```

---

## 7. 這次實際踩過的坑

### 7.1 不要在 PowerShell 用 `%ProgramFiles%`

PowerShell 要用：

```powershell
$env:ProgramFiles
```

不是：

```powershell
%ProgramFiles%
```

### 7.2 不要手打超長 Chrome 啟動參數

容易換行斷掉，造成：

- `--remote-debugging-port=9222` 沒真的帶上
- batch 裡出現 `'port' 不是內部或外部命令`

所以用 `.bat` 最穩。

### 7.3 `host-bridge` 要綁 `0.0.0.0`

如果只綁 `127.0.0.1`：

- Windows 自己測得到
- Linux VM 打不到

所以要這樣啟動：

```powershell
$env:HOST_BRIDGE_HOST='0.0.0.0'
node .\server.mjs
```

### 7.4 VM 直接用 `node` 跑測試時，要自己給 `statePath`

因為這不是在 Codex nodeRepl 內執行，沒有 `nodeRepl.tmpDir`。

所以要明確傳：

```js
statePath: "/tmp/gpt-relay/sessions.json"
```

### 7.5 Windows ChatGPT 是中文介面

這次已知會影響：

- composer 偵測
- send button 偵測
- response completion 偵測

目前這次成功的本地修改已處理這些問題。

---

## 8. 使用時的固定順序

每次要用時，照這個順序最穩：

1. Windows 開 Chrome debug 版
2. Windows 用這個 Chrome 登入 ChatGPT
3. Windows 啟動 `host-bridge`
4. Linux VM 驗證 `/health`
5. Linux VM 設環境變數
6. Linux VM 執行 GPT Relay

---

## 9. Codex Plugin 入口

先依 [docs/global_codex_setup.md](./docs/global_codex_setup.md) 完成一次全域安裝。之後在 Codex
composer 輸入 `@`，選取 **GPT Relay** plugin，再輸入你要交給 ChatGPT 的任務。

`codex-cli 0.141.0` 實測不會把 `~/.codex/prompts/` 註冊為 slash command，因此不要使用
`/prompts:chatgpt`。`@` plugin 選取器是目前可驗證的入口；選取後，Codex 會呼叫 plugin
內建的 MCP relay tool，不需要在 shell 裡執行 Node CLI。

MCP tool 會讀取 `~/.config/gpt-relay/env.sh`。所以就算新開 Codex 的 GUI、IDE 或 shell
沒有繼承 `GPT_RELAY_*` 環境變數，仍可使用同一套 bridge 設定。

例子：

```text
/codex review plugins/gpt-relay/scripts/chatgpt_relay.mjs
```

```text
請交給 ChatGPT：請幫我解釋這個設計的 tradeoff
```

```text
請使用先前 query=repo audit 的 ChatGPT 對話，接著做 security review。
```

```text
請查詢 query=deep research 的 ChatGPT 既有工作，不要重送。
```

---

## 10. 最後確認清單

Windows host：

- Chrome 用 `--remote-debugging-port=9222` 啟動
- `http://127.0.0.1:9222/json/version` 有回 JSON
- ChatGPT 已登入
- `host-bridge` 正在跑
- `http://127.0.0.1:8765/health` 有回應

Linux VM：

- `curl http://192.168.0.72:8765/health` 可通
- 已設 `GPT_RELAY_BROWSER_PROVIDER=host-bridge`
- 已設 `GPT_RELAY_HOST_BRIDGE_URL=http://192.168.0.72:8765`
- 已設 `GPT_RELAY_HOST_BRIDGE_TOKEN=change-me`

只要以上都成立，這條 relay 就能工作。
