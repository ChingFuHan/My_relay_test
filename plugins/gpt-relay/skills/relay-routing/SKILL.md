---
name: relay-routing
description: Use when the user explicitly selects GPT Relay and asks to start, continue, or poll a ChatGPT task.
---

# Relay Routing

After the user explicitly selects GPT Relay, send a new task to ChatGPT, continue an existing
conversation, or poll a stored long-running session as requested.

## Start

Use `runExtendedProRelay(...)` for a new task. Keep the current visible ChatGPT intelligence
selection unless the user explicitly requests another model, mode, or effort.

## Continue

When the user identifies an earlier subject, title, or session id and asks to continue, use
`continueExtendedProRelay(...)` rather than creating an unrelated conversation.

## Poll

When the user asks for progress on a previously started task, use `pollRelaySession(...)` instead
of resending the task.

## Safety

- Explicit selection of GPT Relay authorizes relay of the task.
- Only relay local file paths that the user explicitly included or clearly referred to.
- If ChatGPT is unavailable, report the relay issue rather than silently falling back to Codex.
