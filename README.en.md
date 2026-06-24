# GPT Relay Codex Plugin

[Main README](./README.md) | [中文说明](./README.zh-Hant.md)

GPT Relay lets Codex delegate a task to ChatGPT through your existing Chrome session. It can request visible ChatGPT Intelligence combinations, wait for the final answer, and return the full result to Codex.

## Why This Exists

Codex is excellent for coding work, local files, and automation. ChatGPT may have account-specific UI features such as Pro mode, Deep Research, image generation, and visible model/mode/effort controls. GPT Relay bridges those workflows by letting Codex operate ChatGPT in Chrome when you explicitly ask it to.

## Installation

From the Codex UI:

| Field | Value |
| --- | --- |
| Source | `ChingFuHan/My_relay_test` |
| Git ref | `main` |
| Sparse paths | Leave blank for normal install. Optional: `.agents/plugins` and `plugins/gpt-relay`. |

Or add the marketplace from the CLI:

```bash
codex plugin marketplace add ChingFuHan/My_relay_test --ref main
codex plugin add gpt-relay@gpt-relay-host-bridge
```

Then install **GPT Relay** from the Codex Plugins UI and open a new Codex thread.

The Add marketplace dialog installs this repository as a custom Codex marketplace source. It is not the same thing as publishing to an official built-in OpenAI marketplace.

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

## Repository Layout

```text
.agents/plugins/marketplace.json
plugins/gpt-relay/
  .codex-plugin/plugin.json
  skills/gpt-relay/SKILL.md
  scripts/chatgpt_relay.mjs
  assets/logo.png
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
**GPT Relay**, then enter the task for ChatGPT:

```text
Send this task to ChatGPT: <task>
```

See [docs/global_codex_setup.md](./docs/global_codex_setup.md) and
[docs/new-codex-session.md](./docs/new-codex-session.md).

## Developer

Created by Prompt Case.
