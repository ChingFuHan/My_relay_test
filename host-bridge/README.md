# GPT Relay Host Bridge

Host-side companion service for `plugins/gpt-relay`.

Use this when Codex runs inside a Linux VM but Chrome and the ChatGPT session live on the host machine. The service connects to host Chrome over CDP, then exposes a narrow HTTP bridge that the VM-side plugin can call.

## Status

Current known state:

- Works for Linux VM -> Windows host Chrome relay
- Verified for simple text prompts end-to-end
- Supports opening or claiming tabs
- Supports navigation and Playwright-style RPC through `/tabs/:id/rpc`
- Includes auth token support

Still incomplete:

- `dom_cua.click`
- `clipboard.write(items)` for image/item payloads
- `capabilities.get("pageAssets")`
- some image-generation continuation paths are not fully stable yet

## Host Setup

### Windows quick path

Use the batch files in [`windows/`](./windows):

- `start-chrome-debug.bat`
- `start-host-bridge.bat`
- `start-all.bat`

Recommended:

1. Run `start-chrome-debug.bat`
2. In that Chrome window, log in to ChatGPT
3. Run `start-host-bridge.bat`

Or use `start-all.bat` if you want the laziest path.

### Manual setup

Start Chrome with remote debugging enabled on the host.

Windows example:

```powershell
taskkill /f /im chrome.exe /T
Start-Sleep -Seconds 2
cmd /c host-bridge\windows\start-chrome-debug.bat
```

Then install dependencies and run service:

```powershell
cd host-bridge
npm install
$env:HOST_BRIDGE_TOKEN='change-me'
$env:CHROME_CDP_URL='http://127.0.0.1:9222'
$env:HOST_BRIDGE_HOST='0.0.0.0'
node .\server.mjs
```

Health check:

```powershell
Invoke-WebRequest 'http://127.0.0.1:8765/health' -Headers @{ Authorization = 'Bearer change-me' } | Select-Object -ExpandProperty Content
```

## VM Setup

Point GPT Relay to host bridge:

```bash
export GPT_RELAY_BROWSER_PROVIDER=host-bridge
export GPT_RELAY_HOST_BRIDGE_URL=http://192.168.0.72:8765
export GPT_RELAY_HOST_BRIDGE_TOKEN=change-me
```

Use your actual reachable host IP if it differs from the example above.

Quick health check from the VM:

```bash
rtk curl -H 'Authorization: Bearer change-me' http://192.168.0.72:8765/health
```

For the full proven workflow, read [`../user_quick_start.md`](../user_quick_start.md).

## Security

- Bind service to `127.0.0.1` by default
- Use an SSH tunnel or another explicit transport between VM and host
- Always set `HOST_BRIDGE_TOKEN`
- Do not expose raw CDP port directly to the VM if you can avoid it
