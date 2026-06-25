# Claude Code Slash Commands

Ready-made [Claude Code](https://claude.com/claude-code) slash commands for the two relays in this repo. Each file is a thin wrapper that calls one MCP tool.

| ChatGPT | Gemini | MCP tool |
| --- | --- | --- |
| `/chatgpt <prompt>` | `/gemini <prompt>` | `ask` |
| `/chatgpt-continue <id> -- <prompt>` | `/gemini-continue <id> -- <prompt>` | `continue` |
| `/chatgpt-poll <id>` | `/gemini-poll <id>` | `poll` |
| `/chatgpt-list [filter]` | `/gemini-list [filter]` | `list_sessions` |

## Prerequisite

The slash commands only work once the matching MCP server is registered in Claude Code. Register one or both relays (host bridge must be running — see [`../../docs/usage-codex-and-claude-code.md`](../../docs/usage-codex-and-claude-code.md)):

```bash
claude mcp add gpt-relay    -s user -e GPT_RELAY_BROWSER_PROVIDER=host-bridge -e GPT_RELAY_HOST_BRIDGE_URL=http://127.0.0.1:8765 -e GPT_RELAY_HOST_BRIDGE_TOKEN=change-me -- node /abs/path/plugins/gpt-relay/scripts/mcp_server.mjs
claude mcp add gemini-relay -s user -e GPT_RELAY_BROWSER_PROVIDER=host-bridge -e GPT_RELAY_HOST_BRIDGE_URL=http://127.0.0.1:8765 -e GPT_RELAY_HOST_BRIDGE_TOKEN=change-me -- node /abs/path/plugins/gemini-relay/scripts/mcp_server.mjs
```

The `allowed-tools` in each command file (`mcp__gpt-relay__*`, `mcp__gemini-relay__*`) must match the registered server names `gpt-relay` / `gemini-relay`.

## Install

- **Inside this repo**: nothing to do — Claude Code auto-loads `.claude/commands/` for the current project.
- **Globally (any directory)**: copy them into your user commands:

  ```bash
  cp .claude/commands/*.md ~/.claude/commands/
  ```

## Usage notes

- `continue` / `poll` take a session selector: a keyword, title, or conversation id. `list` shows them.
- Guest (signed-out) conversations have no stable URL, so `continue` / `poll` are not available for them.
