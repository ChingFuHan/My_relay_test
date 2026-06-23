# Project Memory

This repository contains a GPT Relay plugin that can route Codex tasks to ChatGPT.

## Current Working Path

Verified working path on 2026-06-24:

- Linux VM Codex runtime
- `host-bridge` on Windows host
- Windows Chrome launched with CDP on `127.0.0.1:9222`
- ChatGPT logged in on that Windows Chrome
- VM reaches host bridge over HTTP, example: `http://192.168.0.72:8765`

This is the currently proven example path, not the only supported deployment shape.
For deployment choices, read `docs/deployment-modes.md`.

Minimal relay success was verified with prompt:

- `請只回覆 OK。`

## Routing Convention

Use these prefixes as explicit routing signals:

- `/codex ...`
  Keep the work in Codex only.
- `/chatgpt ...`
  Relay the remainder to ChatGPT through GPT Relay.
- `/gpt ...`
  Alias of `/chatgpt`.
- `/chatgpt-continue ...`
  Continue a stored GPT Relay conversation.
- `/chatgpt-poll ...`
  Poll a stored GPT Relay session instead of resending.

These are skill/routing conventions, not guaranteed UI-native slash commands.

## Important Files

- `plugins/gpt-relay/scripts/chatgpt_relay.mjs`
- `plugins/gpt-relay/scripts/adapters/host_bridge_adapter.mjs`
- `plugins/gpt-relay/skills/gpt-relay/SKILL.md`
- `plugins/gpt-relay/skills/relay-routing/SKILL.md`
- `host-bridge/server.mjs`
- `user_quick_start.md`
- `docs/agent_handoff_2026-06-24.md`

## Important Runtime Notes

- Chinese ChatGPT UI fallbacks were added for composer, send button, and completion detection.
- Direct shell tests must provide explicit `statePath`, for example:
  - `/tmp/gpt-relay/sessions.json`
- `host-bridge` is the current bridge path when Codex cannot directly drive the target Chrome session.

## Known Good Environment Variables

On Linux VM:

- `GPT_RELAY_BROWSER_PROVIDER=host-bridge`
- `GPT_RELAY_HOST_BRIDGE_URL=http://192.168.0.72:8765`
- `GPT_RELAY_HOST_BRIDGE_TOKEN=change-me`

On Windows host bridge:

- `HOST_BRIDGE_TOKEN=change-me`
- `CHROME_CDP_URL=http://127.0.0.1:9222`
- `HOST_BRIDGE_HOST=0.0.0.0`

## What Is Proven vs Not Yet Proven

Proven:

- host-bridge connectivity
- simple text relay through ChatGPT

Not yet fully validated after host-bridge integration:

- file upload
- image generation flow
- Deep Research export
- all continuation/polling variants
