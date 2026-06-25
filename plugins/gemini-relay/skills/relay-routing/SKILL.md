---
name: relay-routing
description: Use when the user explicitly selects Gemini Relay and asks to start a Gemini task.
---

# Relay Routing

After the user explicitly selects Gemini Relay, send a new task to Gemini as a fresh prompt.

## Start

- New task: `mcp__gemini_relay__ask` with `{ prompt }`.
- Follow-up on a stored signed-in conversation: `mcp__gemini_relay__continue` with `{ query, prompt }`.
- Re-read a stored session without sending a prompt: `mcp__gemini_relay__poll` with `{ query }`.
- Browse stored sessions: `mcp__gemini_relay__list_sessions` with an optional `{ query }`.

For a visible Gemini guest page, send only a plain-text new task; guest chats have no
stable conversation URL, so continuation and polling are not available. Do not request
attachments, image generation, or model switching.

## Safety

- Explicit selection of Gemini Relay authorizes relay of the task.
- Only relay local file paths that the user explicitly included or clearly referred to.
- If Gemini is unavailable, report the relay issue rather than silently falling back to Codex.
