# Gemini Relay

Local plugin for relaying plain-text prompts to Gemini through the user's Chrome
session. Works from **both Codex and Claude Code** over the shared `host-bridge`
(see [../../docs/usage-gemini-codex-and-claude-code.md](../../docs/usage-gemini-codex-and-claude-code.md)).

## Scope

- Opens Gemini in Chrome.
- Detects `guest`, `logged-in`, `guest-or-logged-out`, and `verification-required`.
- Sends a plain-text prompt and waits for the completed visible answer.
- Returns Gemini's answer as `finalDeliveryText`.
- Captures the conversation URL (`gemini.google.com/app/<id>`) and persists a
  session store, so signed-in chats can be continued, polled, and listed.

## MCP tools

- `ask` — new plain-text task.
- `continue` — follow-up on a stored conversation (signed-in only).
- `poll` — re-read a stored session without sending a prompt.
- `list_sessions` — browse stored sessions.

## Limits

- No model switching.
- No attachments or image generation.
- Guest-mode chats have no stable conversation URL, so they cannot be continued
  or polled.
- Stops on sign-in walls, CAPTCHA, and other blocked states.
