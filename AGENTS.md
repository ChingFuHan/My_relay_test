# Project Memory

This repository contains relay plugins that route **Codex or Claude Code** tasks to ChatGPT or Gemini. Each relay is a stdio MCP server exposing `ask` / `continue` / `poll` / `list_sessions`.

## Current Working Path

Verified working path on 2026-06-24:

- Linux VM Codex runtime
- `host-bridge` on Windows host
- Windows Chrome launched with CDP on `127.0.0.1:9222`
- ChatGPT logged in on that Windows Chrome
- VM reaches host bridge over HTTP, example: `http://192.168.0.72:8765`

This is the currently proven example path, not the only supported deployment shape.
For deployment choices, read `docs/deployment-modes.md`.

Also verified on 2026-06-25:

- Windows local Codex -> local `host-bridge` -> Windows Chrome in ChatGPT guest mode
- plain-text relay succeeds after choosing the visible `保持登出狀態` control

Minimal relay success was verified with prompt:

- `請只回覆 OK。`

## Entry Points

**Codex**: type `@`, select **GPT Relay** or **Gemini Relay**, then describe the task. Both
relays provide MCP tools `ask` / `continue` / `poll` / `list_sessions` (Codex names them
`mcp__gpt_relay__*` and `mcp__gemini_relay__*`). Prefer these over the shell CLI because this
VM's Codex sandbox cannot create a loopback interface.

**Claude Code**: register each relay once with `claude mcp add <name> -s user … -- node
…/scripts/mcp_server.mjs` (host-bridge env). The same four tools are then available in any
directory as `mcp__gpt-relay__*` / `mcp__gemini-relay__*`, plus the `/chatgpt*` and `/gemini*`
slash commands shipped in `.claude/commands/`. See `docs/usage-codex-and-claude-code.md` and
`docs/usage-gemini-codex-and-claude-code.md`.

Codex slash commands are SKILLS, not prompts. This repo ships `codex/skills/<name>/SKILL.md`,
installed to `~/.codex/skills/` by `scripts/install-global-codex-relay.sh`, giving `/chatgpt`,
`/chatgpt-continue`, `/chatgpt-poll`, `/chatgpt-list` and the `/gemini*` set. Codex turns
`~/.codex/skills/<name>/SKILL.md` (frontmatter `name:`/`description:`) into `/<name>` — the same
mechanism behind `/caveman`. Each skill body forces the call onto the web relay (`mcp__gpt_relay__*`
/ `mcp__gemini_relay__*`, underscore form) and forbids a local answer. Skills load at TUI startup,
so open a fresh Codex TUI after install. (Historical note: `~/.codex/prompts/*.md` is NOT a slash
source — an earlier attempt there produced no commands; the old `/prompts:*` form was dropped. If a
build still fails to show them, fall back to the `@` selector.)

## Important Files

- `plugins/gpt-relay/scripts/chatgpt_relay.mjs`
- `plugins/gpt-relay/scripts/chatgpt_cli.mjs`
- `plugins/gpt-relay/scripts/adapters/host_bridge_adapter.mjs`
- `plugins/gpt-relay/skills/gpt-relay/SKILL.md`
- `plugins/gpt-relay/skills/relay-routing/SKILL.md`
- `plugins/gemini-relay/scripts/gemini_relay.mjs`
- `plugins/gemini-relay/scripts/mcp_server.mjs`
- `plugins/gemini-relay/scripts/adapters/host_bridge_adapter.mjs`
- `plugins/gemini-relay/skills/gemini-relay/SKILL.md`
- `plugins/gemini-relay/skills/relay-routing/SKILL.md`
- `host-bridge/server.mjs`
- `user_quick_start.md`
- `scripts/install-global-codex-relay.sh`
- `docs/global_codex_setup.md`
- `docs/new-codex-session.md`
- `docs/agent_handoff_2026-06-24.md`

## Important Runtime Notes

- Chinese ChatGPT UI fallbacks were added for composer, send button, and completion detection.
- Access modes are distinct: `guest` supports plain text only; `logged-in` supports account-visible capabilities. Do not force a guest user to log in.
- Guest sessions have no stable conversation URL. Never call `continue` or `poll` for them, and do not claim a conversation link was returned.
- Gemini Relay is text-first (no attachments, image generation, or model switching), but has full `ask` / `continue` / `poll` / `list_sessions` with a session store. Signed-in chats capture a `gemini.google.com/app/<id>` URL and can be continued/polled; guest chats cannot (no stable URL).
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
- ordinary Node CLI relay through host-bridge
- isolated Codex marketplace install of `gpt-relay@gpt-relay-host-bridge`
- `@` plugin selector shows GPT Relay in a fresh Codex TUI
- MCP server protocol handshake and tool inventory in the plugin source
- Windows local guest-mode plain-text relay, returning `OK` without a ChatGPT login
- Gemini Relay plugin scaffold, MCP server, access-state rules, and tests in repo source
- Gemini Relay live end-to-end on 2026-06-25: signed-in `ask` (captured `/app/<id>` URL), `continue` (Gemini recalled prior turn), `poll`, and `list_sessions` through the local host bridge
- Claude Code user-scope registration of `gemini-relay` (and `gpt-relay`) verified ✔ Connected; `ask`/`continue`/`poll`/`list_sessions` exercised over stdio MCP

Not yet fully validated after host-bridge integration:

- a fresh installed Codex plugin MCP call through the TUI
- file upload
- image generation flow
- Deep Research export
- ChatGPT continuation/polling for long-running (Deep Research) tasks
