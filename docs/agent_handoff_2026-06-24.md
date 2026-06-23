# Agent Handoff - 2026-06-24

This note captures the current state of the `GPT Relay` host-bridge work so the next agent can
continue without re-discovering the same context.

## What Was Added

### 1. Host-side bridge path

New directory:

- `host-bridge/`

Files added:

- `host-bridge/package.json`
- `host-bridge/server.mjs`
- `host-bridge/README.md`

Purpose:

- Let a Linux VM Codex runtime control a Windows host Chrome session through HTTP
- Internally connect to Chrome over CDP (`http://127.0.0.1:9222`)

### 2. GPT Relay host-bridge adapter

New file:

- `plugins/gpt-relay/scripts/adapters/host_bridge_adapter.mjs`

Purpose:

- Add a second browser provider path: `host-bridge`
- Keep existing `codex-extension` path intact

Environment variables used:

- `GPT_RELAY_BROWSER_PROVIDER=host-bridge`
- `GPT_RELAY_HOST_BRIDGE_URL=http://<host-ip>:8765`
- `GPT_RELAY_HOST_BRIDGE_TOKEN=...`

### 3. Main relay script changes

Updated file:

- `plugins/gpt-relay/scripts/chatgpt_relay.mjs`

Main changes:

- `resolveBrowser(...)` can now route to `host-bridge`
- Chinese ChatGPT UI fallback added for:
  - composer detection
  - send button detection
  - completion detection
- direct test runs can succeed when caller supplies explicit `statePath`

### 4. Routing skill / slash-style conventions

New file:

- `plugins/gpt-relay/skills/relay-routing/SKILL.md`

Current slash conventions documented:

- `/codex`
- `/chatgpt`
- `/gpt`
- `/chatgpt-continue`
- `/chatgpt-poll`

Also updated:

- `plugins/gpt-relay/skills/gpt-relay/SKILL.md`
- `plugins/gpt-relay/README.md`

### 5. User quick start

New file:

- `user_quick_start.md`

Purpose:

- Host setup
- VM setup
- exact working commands
- pitfalls found during bring-up

### 6. Global Codex entry points

New files:

- `scripts/install-global-codex-relay.sh`
- `plugins/gpt-relay/scripts/chatgpt_cli.mjs`
- `docs/global_codex_setup.md`
- `docs/new-codex-session.md`

Purpose:

- Make GPT Relay available through Codex's verified `@` plugin selector in any directory.
- Configure the bridge environment under `~/.config/gpt-relay/env.sh`.
- Run host-bridge relay from an ordinary Node process, not only a Codex-specific Node REPL.
- Expose GPT Relay as plugin-provided MCP tools, avoiding this VM's broken sandbox shell path
  (`bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`).

Important distinction:

- `@` -> **GPT Relay** is the supported, verified Codex UI entry point.
- Deprecated custom prompts did not register as slash commands in a fresh `codex-cli 0.141.0` TUI.
- The plugin MCP server is `gpt-relay`, with `ask`, `continue`, `poll`, and
  `list_sessions` tools. Its source entry is `plugins/gpt-relay/scripts/mcp_server.mjs`.
- The host-bridge adapter safely parses only recognized exports from
  `~/.config/gpt-relay/env.sh`; it never sources or evaluates that shell file. This covers Codex
  launches that do not inherit `~/.bashrc`.

## What Was Actually Verified

### Verified end-to-end path

The following path was successfully tested:

- Linux VM -> `host-bridge` -> Windows Chrome -> ChatGPT -> back to Linux VM

Successful minimal prompt:

- `請只回覆 OK。`

Successful result:

```json
{
  "status": "complete",
  "conversationUrl": "https://chatgpt.com/c/6a3ab3c1-1bb4-83ee-9546-e53713fd9047",
  "finalDeliveryText": "OK\n\nConversation URL: https://chatgpt.com/c/6a3ab3c1-1bb4-83ee-9546-e53713fd9047",
  "finalResponseText": "OK\n\nConversation URL: https://chatgpt.com/c/6a3ab3c1-1bb4-83ee-9546-e53713fd9047"
}
```

### Verified Windows host state during success

- Chrome launched with:
  - `--remote-debugging-address=127.0.0.1`
  - `--remote-debugging-port=9222`
  - `--user-data-dir=%TEMP%\gpt-relay-chrome`
- `http://127.0.0.1:9222/json/version` returned valid JSON
- `host-bridge` returned:
  - `{"ok":true,"cdpUrl":"http://127.0.0.1:9222"}`
- ChatGPT UI was Traditional Chinese

### Verified host network path

Successful example host IP:

- `192.168.0.72`

VM test that worked:

```bash
rtk curl -H 'Authorization: Bearer change-me' http://192.168.0.72:8765/health
```

## Important Implementation Notes

### 1. Windows host Chrome UI locale mattered

The success path required adding locale fallbacks because ChatGPT UI was Chinese:

- composer label seen in real page:
  - `與 ChatGPT 對話`
- send button label seen in real page:
  - `傳送提示詞`
- response action labels seen in real page:
  - `複製回應`
- `更多動作`
- `分享`

### 1.1 ChatGPT access state classification was added

The relay now distinguishes these states before treating composer lookup failure as generic:

- `logged-in`
- `guest-or-logged-out`
- `verification-required`
- `unknown`

Implementation notes:

- driven by `readChatGPTAccessState(...)`
- classification logic lives in `classifyChatGPTAccessStateSnapshot(...)`
- checks real signals such as:
  - composer presence
  - profile/account button presence
  - login/sign-up text
  - guest/temporary chat text
  - verification/CAPTCHA text

Why this was needed:

- in real testing, Windows Chrome was sometimes switched into guest / temporary mode
- that can look superficially similar to a usable ChatGPT page unless explicitly classified

### 2. `host-bridge` proxy had to avoid thenable locator traps

The initial generic proxy approach caused problems because Playwright locator-like objects became
thenable and were consumed incorrectly by async flows.

Current fix:

- explicit `createRemotePlaywright(...)`
- explicit `createRemoteLocator(...)`

This is important context if future locator behavior breaks again.

### 3. Direct `node` test runs need explicit `statePath`

When running relay helper directly from shell, there is no `nodeRepl.tmpDir`.

Working pattern:

```js
statePath: "/tmp/gpt-relay/sessions.json"
```

Without this, direct test runs can fail with:

- `SESSION_STORE_PATH_MISSING`

## Current Known Good Commands

### Linux VM minimal relay test

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

### Windows host bridge run command

```powershell
cd C:\Users\User\Documents\GPT-Relay-Codex-Plugin-\host-bridge
$env:HOST_BRIDGE_TOKEN='change-me'
$env:CHROME_CDP_URL='http://127.0.0.1:9222'
$env:HOST_BRIDGE_HOST='0.0.0.0'
node .\server.mjs
```

## Current Scope vs Not Yet Proven

### Proven

- host-bridge connectivity
- Windows Chrome CDP control
- open ChatGPT
- find composer in Chinese UI
- send simple text prompt
- detect simple text response
- return final delivery text

### Not yet proven after host-bridge integration

- file upload path
- image upload / clipboard fallback
- generated image artifact flow
- Deep Research export flow
- all session continuation / polling paths under host-bridge
- non-Chinese UI variants under host-bridge

These may partly work, but were not validated in this bring-up session.

## Suggested Next Work

1. Validate `/chatgpt-continue` and `/chatgpt-poll` through `host-bridge`
2. Validate file upload path from Linux VM to ChatGPT
3. Validate image generation path and artifact persistence
4. Validate Deep Research export path
5. Consider making `statePath` fallback independent from `nodeRepl` for direct shell use
6. If this will be shared, move `host-bridge/` into remote source of truth and push upstream

## Files To Read First For Continuation

- [chatgpt_relay.mjs](/home/xiaohan/git_other/GPT-Relay-Codex-Plugin-/plugins/gpt-relay/scripts/chatgpt_relay.mjs)
- [host_bridge_adapter.mjs](/home/xiaohan/git_other/GPT-Relay-Codex-Plugin-/plugins/gpt-relay/scripts/adapters/host_bridge_adapter.mjs)
- [server.mjs](/home/xiaohan/git_other/GPT-Relay-Codex-Plugin-/host-bridge/server.mjs)
- [user_quick_start.md](/home/xiaohan/git_other/GPT-Relay-Codex-Plugin-/user_quick_start.md)
