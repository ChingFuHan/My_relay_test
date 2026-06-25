# Codex Slash Prompts

Codex (`codex-cli`) custom prompts for the two relays. Each `<name>.md` file becomes the
`/<name>` slash command in the Codex TUI and forces the task onto the **web** ChatGPT/Gemini
(it must call the relay MCP tool and return the web answer verbatim — never a local answer).

| ChatGPT | Gemini | MCP tool (Codex names) |
| --- | --- | --- |
| `/chatgpt <prompt>` | `/gemini <prompt>` | `mcp__gpt_relay__ask` / `mcp__gemini_relay__ask` |
| `/chatgpt-continue <id> -- <prompt>` | `/gemini-continue <id> -- <prompt>` | `…__continue` |
| `/chatgpt-poll <id>` | `/gemini-poll <id>` | `…__poll` |
| `/chatgpt-list [filter]` | `/gemini-list [filter]` | `…__list_sessions` |

> Codex namespaces MCP tools with **underscores** (`mcp__gpt_relay__ask`). This differs from
> Claude Code's hyphenated `mcp__gpt-relay__ask` in [`../../.claude/commands/`](../../.claude/commands/).
> Keep the two sets separate.

## Prerequisite

The matching Codex plugin must be installed so its MCP server is available:

```bash
codex plugin marketplace add ChingFuHan/My_relay_test --ref main
codex plugin add gpt-relay@gpt-relay-host-bridge
codex plugin add gemini-relay@gpt-relay-host-bridge
```

`codex mcp list` should then show `gpt-relay` and `gemini-relay` as `enabled`.

## Install

- **Automatic**: `bash scripts/install-global-codex-relay.sh …` copies these files into
  `~/.codex/prompts/` and installs both plugins.
- **Manual**: `cp codex/prompts/*.md ~/.codex/prompts/`

Open a **new** Codex TUI afterwards (prompts load at startup), type `/`, and the commands appear.

## Notes

- `continue` / `poll` take a session selector: a keyword, title, or conversation id. `list` shows them.
- Guest (signed-out) chats have no stable conversation URL, so `continue` / `poll` are unavailable for them.
- Requires `codex-cli` that registers `~/.codex/prompts/` as slash commands (verified intent on 0.142.2;
  the older 0.141.0 did not). If `/chatgpt` does not appear, use the `@` plugin selector instead.
