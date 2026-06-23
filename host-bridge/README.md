# GPT Relay Host Bridge

Host-side companion service for `plugins/gpt-relay`.

Use this when Codex cannot directly drive the Chrome session that already has ChatGPT logged in. The service connects to Chrome over CDP, then exposes a narrow HTTP bridge that the Codex-side plugin can call.

This is not VM-only. It supports:

- local single-machine use
- host/guest setups such as VM, Docker, or WSL
- remote machine to remote machine use over a reachable network path

For deployment patterns, read [`../docs/deployment-modes.md`](../docs/deployment-modes.md).

## Status

Current known state:

- Works for host/guest relay
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

## Codex-Side Setup

Point GPT Relay to host bridge from the environment where Codex is running.

### Local Mode

If Codex and `host-bridge` are on the same machine:

```bash
export GPT_RELAY_BROWSER_PROVIDER=host-bridge
export GPT_RELAY_HOST_BRIDGE_URL=http://127.0.0.1:8765
export GPT_RELAY_HOST_BRIDGE_TOKEN=change-me
```

### Host/Guest Mode

If Codex is inside a VM, container, WSL, or another guest environment:

```bash
export GPT_RELAY_BROWSER_PROVIDER=host-bridge
export GPT_RELAY_HOST_BRIDGE_URL=http://192.168.0.72:8765
export GPT_RELAY_HOST_BRIDGE_TOKEN=change-me
```

Use your actual reachable host IP if it differs from the example above.

Quick health check from the guest:

```bash
rtk curl -H 'Authorization: Bearer change-me' http://192.168.0.72:8765/health
```

### Remote Mode

If Codex runs on another machine entirely:

```bash
export GPT_RELAY_BROWSER_PROVIDER=host-bridge
export GPT_RELAY_HOST_BRIDGE_URL=http://<remote-host>:8765
export GPT_RELAY_HOST_BRIDGE_TOKEN=change-me
```

For a full proven workflow, read [`../user_quick_start.md`](../user_quick_start.md). That file documents the currently verified Windows-host + Linux-VM example.

## Security

- Bind service to `127.0.0.1` by default
- Use an SSH tunnel or another explicit transport between machines when possible
- Always set `HOST_BRIDGE_TOKEN`
- Do not expose raw CDP port directly unless you have to
