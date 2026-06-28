# GPT Relay & Gemini Relay — for Codex and Claude Code

[Main README](./README.md) | [中文说明](./README.zh-Hant.md)

This repository ships two browser relay plugins:

- **GPT Relay** for **ChatGPT**.
- **Gemini Relay** for **Gemini**.

Each relay is a standard **stdio MCP server**, so the same plugin works from **Codex** and from **Claude Code** in any directory. Both relays expose the same four tools — `ask`, `continue`, `poll`, and `list_sessions` — and drive the chat through your existing Chrome session: they send the prompt, wait for the visible answer, and return the full result.

## Why This Exists

Codex and Claude Code are excellent for coding work, local files, and automation. ChatGPT and Gemini have account-specific web UI features — Pro mode, Deep Research, image generation, visible model/mode/effort controls — that a coding agent cannot reach directly. These relays bridge that gap by operating the chat in Chrome when you explicitly ask, then handing the result back to your agent.

The relay core makes no assumptions about which agent calls it. **Codex** picks it up from the plugin marketplace; **Claude Code** registers it with `claude mcp add` (see [Use From Claude Code](#use-from-claude-code)).

## Install for Codex

From the Codex UI:

| Field | Value |
| --- | --- |
| Source | `ChingFuHan/My_relay_test` |
| Git ref | `main` |
| Sparse paths | Leave blank for normal install. Optional: `.agents/plugins`, `plugins/gpt-relay`, and `plugins/gemini-relay`. |

Or add the marketplace from the CLI:

```bash
codex plugin marketplace add ChingFuHan/My_relay_test --ref main
codex plugin add gpt-relay@gpt-relay-host-bridge
codex plugin add gemini-relay@gpt-relay-host-bridge
```

Then install **GPT Relay** or **Gemini Relay** from the Codex Plugins UI and open a new Codex thread.

The Add marketplace dialog installs this repository as a custom Codex marketplace source. It is not the same thing as publishing to an official built-in OpenAI marketplace.

## Use From Claude Code

Claude Code does not use the Codex marketplace or the Codex Chrome extension. It talks to each relay as a standard stdio MCP server over the `host-bridge` path. Register once at user scope and it is available in every directory.

Start the host bridge first (see [Host-Bridge Deployment Modes](#host-bridge-deployment-modes)), then:

```bash
# ChatGPT relay
claude mcp add gpt-relay -s user \
  -e GPT_RELAY_BROWSER_PROVIDER=host-bridge \
  -e GPT_RELAY_HOST_BRIDGE_URL=http://192.168.0.72:8765 \
  -e GPT_RELAY_HOST_BRIDGE_TOKEN=change-me \
  -e GPT_RELAY_STATE_PATH="$HOME/.codex/gpt-relay/sessions.json" \
  -- node /absolute/path/to/plugins/gpt-relay/scripts/mcp_server.mjs

# Gemini relay
claude mcp add gemini-relay -s user \
  -e GPT_RELAY_BROWSER_PROVIDER=host-bridge \
  -e GPT_RELAY_HOST_BRIDGE_URL=http://192.168.0.72:8765 \
  -e GPT_RELAY_HOST_BRIDGE_TOKEN=change-me \
  -e GEMINI_RELAY_STATE_PATH="$HOME/.codex/gemini-relay/sessions.json" \
  -- node /absolute/path/to/plugins/gemini-relay/scripts/mcp_server.mjs
```

Verify with `claude mcp get gpt-relay` / `claude mcp get gemini-relay` (Status: ✔ Connected). Use an absolute path to `mcp_server.mjs`, and `http://127.0.0.1:8765` if Claude Code runs on the same machine as Chrome.

The relays then expose the `ask` / `continue` / `poll` / `list_sessions` tools. This repo also ships slash commands in [`.claude/commands/`](./.claude/commands/) — `/chatgpt`, `/chatgpt-continue`, `/chatgpt-poll`, `/chatgpt-list` and `/gemini`, `/gemini-continue`, `/gemini-poll`, `/gemini-list`. They auto-load inside this repo; run `cp .claude/commands/*.md ~/.claude/commands/` to use them anywhere.

**Codex** gets the same slash commands as skills in [`codex/skills/`](./codex/skills/) (installed to `~/.codex/skills/` by `scripts/install-global-codex-relay.sh`). Codex turns `~/.codex/skills/<name>/SKILL.md` into the `/<name>` command (same mechanism as `/caveman`). They force the task onto the web relay and never answer locally — open a new Codex TUI after install. See [`codex/skills/README.md`](./codex/skills/README.md).

Full walkthrough: [docs/usage-codex-and-claude-code.md](./docs/usage-codex-and-claude-code.md) (ChatGPT) and [docs/usage-gemini-codex-and-claude-code.md](./docs/usage-gemini-codex-and-claude-code.md) (Gemini).

## Chrome Setup

The direct browser-provider path needs the official Codex Chrome extension. The `host-bridge` path
uses Chrome CDP and does not require that extension for ordinary text relay.

### Install The Codex Chrome Extension

Install the official Codex extension from the Chrome Web Store:

[Codex on Chrome Web Store](https://chromewebstore.google.com/detail/codex/hehggadaopoacecdllhhajmbjkdcmajg)

![Codex Chrome extension on Chrome Web Store](./media/chrome-web-store-codex-extension.png)

### Enable File Uploads

If you want GPT Relay to upload local files or images to ChatGPT, enable file URL access for the Codex Chrome extension:

1. Open Chrome **Manage Extensions**.
2. Open **Details** for the Codex extension.
3. Turn on **Allow access to file URLs**.

![Allow access to file URLs for Codex Chrome extension](./media/chrome-extension-file-urls.png)

## ChatGPT Access Modes

| Mode | Supported relay | Not available |
| --- | --- | --- |
| **Guest** (not signed in) | Plain-text prompts and responses; GPT Relay may choose ChatGPT's visible **Keep logged out** path. | Account-only models, uploads, image generation, Deep Research, a stable conversation URL, continuation, and polling. |
| **Signed in** | Features visible to the ChatGPT account, including persistent conversations and account-gated model choices. | Features unavailable to the account, plus host-bridge flows not yet fully validated. |

Guest mode is verified for Windows local host-bridge text relay. Signed-in attachments, image generation, Deep Research, and some continuation paths remain partially validated through host-bridge.

## Gemini Access Modes

`Gemini Relay` is text-first through Gemini's visible web UI, with the same `ask` / `continue` / `poll` / `list_sessions` tools as GPT Relay, backed by a session store:

| State | Supported | Not supported |
| --- | --- | --- |
| **Guest** (not signed in) | Plain-text prompts and responses when Gemini exposes a usable signed-out composer. | Model switching, uploads, images; and — because there is no stable conversation URL — continuation and polling. |
| **Signed in** | Plain-text prompts and responses; the conversation URL (`gemini.google.com/app/<id>`) is captured and stored, so the chat can be continued, polled, and listed. | Model switching, uploads, image generation. |
| **Blocked** | No relay. | Gemini Relay reports login or verification errors without clicking sign-in controls. |

## Repository Layout

```text
.agents/plugins/marketplace.json
plugins/gpt-relay/
plugins/gemini-relay/
  .codex-plugin/plugin.json
  skills/
  scripts/
media/
  plugin-install-screen.png
  gpt-relay-demo.gif
  chrome-web-store-codex-extension.png
  chrome-extension-file-urls.png
```

## Capabilities

- Visible ChatGPT Intelligence selection.
- Default behavior that preserves your current ChatGPT selection unless you request a change.
- Pro effort handling: Standard and Extended.
- Thinking effort handling: Light, Standard, Extended, and Heavy when visible.
- Clear unavailable-option errors instead of silent fallback.
- Prompt relay, file upload, image generation, web search, and Deep Research requests.
- Full delivery back to Codex with Markdown formatting; images, artifacts, and conversation URLs are available only when the selected ChatGPT mode supports them.
- Stored signed-in session metadata for continuation and polling.

## Limitations

- Requires either the official Codex Chrome extension or this repository's host-bridge path, plus either an interactive ChatGPT guest page or an active ChatGPT login.
- Local file uploads require **Allow access to file URLs** to be enabled for the Codex Chrome extension.
- Availability depends on your ChatGPT account.
- The plugin operates the visible ChatGPT web UI, so ChatGPT UI changes may require plugin updates.
- Long-running signed-in tasks may need polling from Codex; guest chats cannot be resumed or polled because they have no stable conversation URL.

## Host-Bridge Deployment Modes

If Codex cannot directly use the Chrome session that has ChatGPT open—signed in or interactive guest mode—use the host-bridge path.

Common cases:

- Codex and Chrome are on the same machine
- Codex runs in a VM, Docker container, WSL instance, or dev container
- Codex and Chrome are on different machines

Start here:

- [docs/deployment-modes.md](./docs/deployment-modes.md)
- [docs/global_codex_setup.md](./docs/global_codex_setup.md)
- [user_quick_start.md](./user_quick_start.md)

## Use From Any Directory

Install the bridge environment, plugin, and native Codex prompt commands once:

```bash
bash scripts/install-global-codex-relay.sh \
  --bridge-url http://192.168.0.72:8765 \
  --bridge-token 'change-me'
```

Open a new terminal and a new Codex thread in any repository. In the composer, type `@`, select
**GPT Relay** or **Gemini Relay**, then enter the task:

```text
Send this task to ChatGPT: <task>
```

See [docs/global_codex_setup.md](./docs/global_codex_setup.md) and
[docs/new-codex-session.md](./docs/new-codex-session.md).

## Developer

Created by Prompt Case.
