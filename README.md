# GPT Relay & Gemini Relay — for Codex and Claude Code

[中文说明](./README.zh-Hant.md) | [English details](./README.en.md)

This repository ships **two browser relay plugins**:

- **GPT Relay** — relays prompts to **ChatGPT**.
- **Gemini Relay** — relays prompts to **Gemini**.

Each relay is a standard **stdio MCP server**, so it works the same way from **Codex** *and* **Claude Code**, in any directory. Both relays expose the same four tools:

- `ask` — send a new prompt and return the answer.
- `continue` — follow up on a stored (signed-in) conversation.
- `poll` — re-read a stored conversation without sending a new prompt.
- `list_sessions` — browse stored conversations.

A relay opens the chat in your existing Chrome session, sends the prompt, waits for the visible answer, and returns it — plus, where your signed-in account supports them, generated images, Deep Research reports (ChatGPT), and resumable conversation URLs.

**Two ways to use it:**

- **Codex** — install from the plugin marketplace, then pick the relay with `@`. See [Install for Codex](#install-for-codex).
- **Claude Code** — register the MCP server once with `claude mcp add`, then call the tools or the `/chatgpt` and `/gemini` slash commands from any directory. See [Install for Claude Code](#install-for-claude-code).

> This is an independent community project by Prompt Case. It is not an official OpenAI, ChatGPT, or Google product.

## Demo

### Codex Install Screen

![GPT Relay install screen](./media/plugin-install-screen.png)

### Codex and ChatGPT Side-by-Side

The demo below shows Codex calling GPT Relay while Chrome opens ChatGPT, switches the requested visible model/mode/effort, sends the prompt, and returns the result.

![GPT Relay demo](./media/gpt-relay-demo.gif)

## Install for Codex

### Option A: Install From The Codex UI

In Codex, open **Plugins** → **Manage** → **Create** → **Add marketplace**, then fill in:

| Field | Value |
| --- | --- |
| Source | `ChingFuHan/My_relay_test` |
| Git ref | `main` |
| Sparse paths | Leave blank for the normal install. Optionally use `.agents/plugins`, `plugins/gpt-relay`, and `plugins/gemini-relay` if your Codex build asks for sparse checkout paths. |

After adding the marketplace, install **GPT Relay** and/or **Gemini Relay**, then start a new Codex thread.

### Option B: Add The Marketplace From The CLI

Run this command in your Codex environment:

```bash
codex plugin marketplace add ChingFuHan/My_relay_test --ref main
codex plugin add gpt-relay@gpt-relay-host-bridge
codex plugin add gemini-relay@gpt-relay-host-bridge
```

Then install **GPT Relay** or **Gemini Relay** from the Codex Plugins UI and start a new Codex thread.

## Install for Claude Code

Claude Code talks to each relay as a standard stdio MCP server. Register it once at **user scope** and it works in every project and directory — no marketplace, no Codex Chrome extension.

First make sure the host bridge is running (see [Host-Bridge Path](#host-bridge-path)). Then register one or both relays:

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

Verify with `claude mcp get gpt-relay` / `claude mcp get gemini-relay` (Status should be ✔ Connected). Notes:

- Use an **absolute path** to `mcp_server.mjs`.
- Both relays share the same host bridge; the `GPT_RELAY_HOST_BRIDGE_*` variables apply to both. Use `http://127.0.0.1:8765` when Claude Code runs on the same machine as Chrome.
- The two state-path variables (`GPT_RELAY_STATE_PATH`, `GEMINI_RELAY_STATE_PATH`) keep each relay's session history in its own file.

Full walkthrough: [docs/usage-codex-and-claude-code.md](./docs/usage-codex-and-claude-code.md) (ChatGPT) and [docs/usage-gemini-codex-and-claude-code.md](./docs/usage-gemini-codex-and-claude-code.md) (Gemini).

### Slash Commands (Claude Code)

This repo ships ready-made slash commands in [`.claude/commands/`](./.claude/commands/). They are auto-loaded when you open Claude Code inside this repo; to use them in any directory, copy them into your user commands once:

```bash
cp .claude/commands/*.md ~/.claude/commands/
```

| ChatGPT | Gemini | Tool |
| --- | --- | --- |
| `/chatgpt <prompt>` | `/gemini <prompt>` | `ask` |
| `/chatgpt-continue <id> -- <prompt>` | `/gemini-continue <id> -- <prompt>` | `continue` |
| `/chatgpt-poll <id>` | `/gemini-poll <id>` | `poll` |
| `/chatgpt-list` | `/gemini-list` | `list_sessions` |

**Codex** has the same slash commands via [`codex/prompts/`](./codex/prompts/) — `scripts/install-global-codex-relay.sh` copies them to `~/.codex/prompts/` (open a new Codex TUI afterwards). They force the task onto the web relay and never answer locally. See [`codex/prompts/README.md`](./codex/prompts/README.md).

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

## Requirements

- Codex with plugin support, **or** Claude Code (registered via `claude mcp add`).
- Either the official Codex Chrome extension, or the `host-bridge` setup in this repo. Claude Code always uses the `host-bridge` path.
- A ChatGPT session in Chrome. Text-only guest relays are supported; account-only models, uploads, and tools still require the capabilities visible in ChatGPT. Guest chats do not expose a stable URL, so they cannot be resumed or polled.
- **Allow access to file URLs** enabled if you want GPT Relay to upload local attachments.
- Your ChatGPT account must have access to the model or mode you request. For example, Pro mode requires a ChatGPT Pro account.

## ChatGPT Access Modes

| Mode | Supported relay | Not available |
| --- | --- | --- |
| **Guest** (not signed in) | Plain-text prompts and responses. If ChatGPT shows **Keep logged out**, GPT Relay stays in guest mode. | Account-only models, uploads, image generation, Deep Research, a stable conversation URL, continuation, and polling. |
| **Signed in** | Features visible to that ChatGPT account, including persistent conversations and account-gated model choices. | Any feature not available to the account or not yet fully validated through host-bridge. |

Guest mode is currently verified for Windows local host-bridge text relay. Signed-in host-bridge attachments, image generation, Deep Research, and some continuation paths remain partially validated.

## Gemini Access Modes

`Gemini Relay` is text-first through Gemini's visible web UI, with `ask` / `continue` / `poll` / `list_sessions` tools backed by a session store.

| State | Works | Does not work |
| --- | --- | --- |
| **Guest** (not signed in) | Plain-text prompts and responses when Gemini exposes an interactive signed-out composer. | Model switching, uploads, image generation, and — because there is no stable conversation URL — continuation and polling. |
| **Signed in** | Plain-text prompts and responses; the conversation URL is captured and stored, so the chat can be continued, polled, and listed. | Model switching, uploads, image generation. |
| **Blocked** | No relay. | Gemini Relay returns an explicit login or verification error and does not click sign-in controls. |

> **Also works with Claude Code.** Like GPT Relay, the Gemini relay core is a standard stdio MCP server, so Claude Code can register it directly (`claude mcp add gemini-relay ...`) and use the same tools, plus `/gemini`, `/gemini-continue`, `/gemini-poll`, `/gemini-list` slash commands. See [docs/usage-gemini-codex-and-claude-code.md](./docs/usage-gemini-codex-and-claude-code.md).

## Host-Bridge Path

If Codex cannot directly use the Chrome session that has ChatGPT open—signed in or interactive guest mode—use the host-bridge path in this repo.

This is one repository: `plugins/gpt-relay` and `plugins/gemini-relay` run in Codex, while
`host-bridge` runs beside the Chrome session. They can be on the same machine,
or split between a Linux VM and a Windows host.

Common cases:

- Codex and Chrome are on the same machine, but you want a dedicated bridge
- Codex runs in a VM, Docker container, WSL instance, or dev container
- Codex runs on a different machine from the Chrome session you want to use

Start here:

- [user_quick_start.md](./user_quick_start.md)
- [docs/README.md](./docs/README.md)
- [docs/deployment-modes.md](./docs/deployment-modes.md)
- [docs/global_codex_setup.md](./docs/global_codex_setup.md)
- [host-bridge/README.md](./host-bridge/README.md)
- [Windows host bridge guide (Traditional Chinese)](./host-bridge/windows/使用說明.md)

## Use In Every Session

**Codex** — install the plugin, shell environment, and native Codex slash prompts once:

```bash
bash scripts/install-global-codex-relay.sh \
  --bridge-url http://192.168.0.72:8765 \
  --bridge-token 'change-me'
```

Then open a new terminal and Codex thread anywhere. In the composer, type `@`, select **GPT Relay**
or **Gemini Relay**, and enter the task.

```text
請交給 ChatGPT：<task>
```

See [docs/global_codex_setup.md](./docs/global_codex_setup.md) for the complete setup and
[docs/new-codex-session.md](./docs/new-codex-session.md) for daily use.

**Claude Code** — a single `claude mcp add … -s user` (see [Install for Claude Code](#install-for-claude-code)) makes the relay available in every directory. Then either ask in natural language ("Send this to ChatGPT: …") or use the `/chatgpt` and `/gemini` slash commands.

## Marketplace Package

This repository is structured as a Codex plugin marketplace source. Codex needs:

- `.agents/plugins/marketplace.json` at the repository root.
- `plugins/gpt-relay/.codex-plugin/plugin.json`.
- `plugins/gemini-relay/.codex-plugin/plugin.json`.
- The plugin source folders at `plugins/gpt-relay` and `plugins/gemini-relay`.
- A valid Git ref, normally `main`.

The Codex **Add marketplace** dialog adds this repository as a custom marketplace source. It is different from publishing to an official built-in OpenAI marketplace.

## What It Can Do

- Keep your current ChatGPT Intelligence selection when you do not request a model change.
- Switch visible ChatGPT Intelligence options when requested, such as `5.5 Pro Extended` or `5.4 Thinking Light`.
- Refuse clearly when the requested option is not visible in your account, instead of silently falling back to another model.
- Send prompts and supported file attachments to ChatGPT.
- Return ChatGPT replies as normal Markdown, preserving headings, lists, tables, links, and code blocks where possible.
- Return generated images as local image artifacts.
- Export completed Deep Research reports to Markdown artifacts.
- Keep signed-in conversation metadata so you can continue or poll long-running ChatGPT tasks.

## Example Prompts

```text
Use GPT 5.5 Pro Extended to analyze this question: ...
```

```text
Run Deep Research on this topic: ...
```

```text
Switch to GPT 5.4 Thinking Light and analyze this image.
```

## Update

To update the marketplace source later:

```bash
codex plugin marketplace upgrade gpt-relay-host-bridge
```

Update or reinstall **GPT Relay** or **Gemini Relay** from the Codex Plugins UI, then start a new Codex thread.

## Notes

- GPT Relay operates through the visible ChatGPT web UI. If ChatGPT changes its UI, selectors may need updates.
- The plugin reports the visible model/mode/effort selected in ChatGPT. It does not claim hidden backend state.
- It dismisses ChatGPT's explicit **Keep logged out** guest welcome prompt for text relays, but stops on other login prompts, CAPTCHA, permission dialogs, or unavailable account features.
