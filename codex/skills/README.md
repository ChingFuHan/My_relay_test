# Codex Skills (slash commands)

Codex (`codex-cli`) exposes user slash commands through **skills**: a folder
`~/.codex/skills/<name>/SKILL.md` becomes the `/<name>` command in the Codex TUI
(this is the same mechanism that makes `/caveman` work). These 8 skills force each
task onto the **web** ChatGPT/Gemini — they call the relay MCP tool and return the
web answer verbatim, never a local answer.

| ChatGPT | Gemini | MCP tool (Codex names, underscores) |
| --- | --- | --- |
| `/chatgpt <prompt>` | `/gemini <prompt>` | `mcp__gpt_relay__ask` / `mcp__gemini_relay__ask` |
| `/chatgpt-continue <id> -- <prompt>` | `/gemini-continue <id> -- <prompt>` | `…__continue` |
| `/chatgpt-poll <id>` | `/gemini-poll <id>` | `…__poll` |
| `/chatgpt-list [filter]` | `/gemini-list [filter]` | `…__list_sessions` |

> Codex namespaces MCP tools with **underscores** (`mcp__gpt_relay__ask`). This differs
> from Claude Code's hyphenated `mcp__gpt-relay__ask` in [`../../.claude/commands/`](../../.claude/commands/).
> Keep the two sets separate. `~/.codex/prompts/` is **not** a slash source — skills are.

## Prerequisite

The matching Codex plugin must be installed so its MCP server is available:

```bash
codex plugin marketplace add ChingFuHan/My_relay_test --ref main
codex plugin add gpt-relay@gpt-relay-host-bridge
codex plugin add gemini-relay@gpt-relay-host-bridge
```

`codex mcp list` should then show `gpt-relay` and `gemini-relay` as `enabled`.

## Install

- **Automatic**: `bash scripts/install-global-codex-relay.sh …` copies these skill folders
  into `~/.codex/skills/` and installs both plugins.
- **Manual**: `cp -r codex/skills/chatgpt codex/skills/gemini … ~/.codex/skills/`
  (copy each `<name>/` folder; skip this README).

Open a **new** Codex TUI afterwards (skills load at startup), type `/`, and the commands appear.

## Notes

- `continue` / `poll` take a session selector: a keyword, title, or conversation id. `list` shows them.
- Guest (signed-out) chats have no stable conversation URL, so `continue` / `poll` are unavailable for them.
