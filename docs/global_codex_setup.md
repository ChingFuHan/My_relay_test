# Global Codex Setup

這份文件解決的是：

- 不是只在這個 repo 可用
- 不是每開一個新 Codex 都要重貼 prompt
- 而是讓 GPT Relay / host-bridge 變成你平常開 Codex 時就帶著的能力

如果你還不確定自己是哪種拓樸，先看：

- [deployment-modes.md](./deployment-modes.md)

## 結論先講

要做到「直接套在 Codex 上」，需要三層：

1. 某個地方常駐好 Chrome debug + `host-bridge`
2. 你用來啟動 Codex 的 shell 一開就帶上 GPT Relay 環境變數
3. Codex 裡已安裝 `GPT Relay` plugin

只有做第 3 層還不夠，因為 plugin 還是要知道 bridge 在哪。

## 1. 準備 Bridge 所在的機器

如果你的 bridge 機器是 Windows，可直接用這三個檔：

用這三個檔即可：

- [../host-bridge/windows/start-chrome-debug.bat](../host-bridge/windows/start-chrome-debug.bat)
- [../host-bridge/windows/start-host-bridge.bat](../host-bridge/windows/start-host-bridge.bat)
- [../host-bridge/windows/start-all.bat](../host-bridge/windows/start-all.bat)

最懶做法：

1. 雙擊 `start-all.bat`
2. 在打開的 Chrome 裡登入 ChatGPT
3. 不要關掉 host-bridge 視窗

如果不是 Windows，也可以手動啟動 `host-bridge`，重點只有：

- Chrome 要開 `--remote-debugging-port=9222`
- `host-bridge` 要能連到那個 Chrome
- Codex 端要能打到 `HOST_BRIDGE_HOST:HOST_BRIDGE_PORT`

## 2. 讓 Codex 啟動 shell 自動帶入環境變數

讓你平常用來啟動 Codex 的 shell 自動帶入環境變數。

最省事做法是直接跑安裝腳本：

```bash
bash scripts/install-gpt-relay-shell-env.sh
```

它會做兩件事：

- 建立 `~/.config/gpt-relay/env.sh`
- 自動把載入這個檔案的設定加進 `~/.bashrc` 或 `~/.zshrc`

如果你要手動做，再看下面。

先建立設定檔：

```bash
mkdir -p ~/.config/gpt-relay
cp scripts/gpt-relay-env.example.sh ~/.config/gpt-relay/env.sh
```

再編輯。

Local Mode 範例：

```bash
export GPT_RELAY_BROWSER_PROVIDER=host-bridge
export GPT_RELAY_HOST_BRIDGE_URL=http://127.0.0.1:8765
export GPT_RELAY_HOST_BRIDGE_TOKEN=change-me
```

Host/Guest Mode 範例：

```bash
export GPT_RELAY_BROWSER_PROVIDER=host-bridge
export GPT_RELAY_HOST_BRIDGE_URL=http://192.168.0.72:8765
export GPT_RELAY_HOST_BRIDGE_TOKEN=change-me
```

Remote Mode 範例：

```bash
export GPT_RELAY_BROWSER_PROVIDER=host-bridge
export GPT_RELAY_HOST_BRIDGE_URL=http://<remote-host>:8765
export GPT_RELAY_HOST_BRIDGE_TOKEN=change-me
```

然後把下面這行加到你的 `~/.bashrc` 或 `~/.zshrc`：

```bash
[ -f "$HOME/.config/gpt-relay/env.sh" ] && . "$HOME/.config/gpt-relay/env.sh"
```

這樣你之後每次開新 shell，再從那個 shell 開 Codex，就會自動帶到。

### 可直接貼進 `~/.bashrc` 的版本

如果你不想跑腳本，直接貼這段也可以：

```bash
mkdir -p "$HOME/.config/gpt-relay"
cat > "$HOME/.config/gpt-relay/env.sh" <<'EOF'
export GPT_RELAY_BROWSER_PROVIDER=host-bridge
export GPT_RELAY_HOST_BRIDGE_URL=http://192.168.0.72:8765
export GPT_RELAY_HOST_BRIDGE_TOKEN=change-me
EOF

if ! grep -Fqx '[ -f "$HOME/.config/gpt-relay/env.sh" ] && . "$HOME/.config/gpt-relay/env.sh"' "$HOME/.bashrc"; then
  printf '\n[ -f "$HOME/.config/gpt-relay/env.sh" ] && . "$HOME/.config/gpt-relay/env.sh"\n' >> "$HOME/.bashrc"
fi

. "$HOME/.bashrc"
```

## 3. Codex plugin

在 Codex 裡安裝這個 repo 的 marketplace / plugin。

如果你已經安裝過 `GPT Relay`，這一步通常不用重做。

關鍵不是「記得 prompt」，
而是：

- plugin 已存在
- shell env 已存在
- host bridge 已存在

這三個到位，新開的 Codex 才會像「原生可用」。

## 4. 限制

這裡要講清楚：

- 我們可以讓新開的 Codex 自動擁有環境與 plugin 能力
- 但不能在沒有安裝 plugin / 沒有設定 shell env / 沒有 host bridge 的情況下，自動憑空繼承能力

也就是說，這不是靠聊天記憶完成的，而是靠一次性系統安裝完成的。

## 5. 最接近原生的使用方式

你之後的實際操作應該是：

1. 在 bridge 所在機器先啟動 Chrome debug 與 `host-bridge`
2. 開一個已載入 shell env 的新 terminal
3. 直接啟動 Codex
4. 在 Codex 裡使用 GPT Relay plugin

如果 shell env 與 plugin 都裝好了，你就不需要每次重新講一次 host-bridge 設定。
