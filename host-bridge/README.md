# GPT Relay Host Bridge

Host-side companion service for `plugins/gpt-relay`.

Use this when Codex cannot directly drive the Chrome session that has ChatGPT open. The service connects to Chrome over CDP, then exposes a narrow HTTP bridge that the Codex-side plugin can call.

The bridge supports either a signed-in ChatGPT session or an interactive guest page. Guest mode is limited to plain-text relay and has no resumable conversation URL; account-only features require a signed-in ChatGPT account. See the access-mode table in [the root README](../README.md#chatgpt-access-modes).

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
- Auto-reconnects to Chrome over CDP if the debug Chrome restarts. The cached
  browser is validated with `isConnected()` before reuse, reconnects when stale,
  and clears cached page handles on `disconnect`, so the relay can keep opening a
  fresh ChatGPT tab without restarting the bridge.
- `GET /health` reports the live `isConnected()` state instead of a false positive
  from a stale cached connection.

Still incomplete:

- `dom_cua.click`
- `clipboard.write(items)` for image/item payloads
- `capabilities.get("pageAssets")`
- some image-generation continuation paths are not fully stable yet

## Host Setup

### Windows quick path

This repo contains both the Codex plugin and its Windows host companion. If
Codex runs in a Linux VM, WSL, Docker, or another machine, use the managed
Windows entrypoints in [`windows/`](./windows):

1. Run `setup-host-bridge-deps.bat` once, or let the main launcher install dependencies.
2. Run `run-gpt-relay-host.bat`. It starts debug Chrome, starts the bridge, and verifies `/health`.
3. Log in to ChatGPT in the new debug Chrome window.
4. Set `GPT_RELAY_BROWSER_PROVIDER=host-bridge`, the Windows host URL, and the same Token in the Codex environment.

Use `status-gpt-relay-host.bat` to diagnose state and `stop-gpt-relay-host.bat`
to stop the bridge and its dedicated debug Chrome. See the Traditional Chinese
[Windows guide](./windows/使用說明.md) for the complete VM-to-Windows workflow.

`start-chrome-debug.bat`, `start-host-bridge.bat`, and `start-all.bat` remain
available for manual or advanced startup.

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
