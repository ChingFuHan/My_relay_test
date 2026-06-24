---
name: relay-routing
description: Use when the user explicitly selects GPT Relay and asks to start, continue, or poll a ChatGPT task.
---

# Relay Routing

After the user explicitly selects GPT Relay, send a new task to ChatGPT, continue an existing
conversation, or poll a stored long-running session as requested.

## Start

Use mcp__gpt_relay__ask for a new task. Keep the current visible ChatGPT intelligence selection
unless the user explicitly requests another model, mode, or effort.

For a visible ChatGPT guest page, send only a plain-text new task. Do not request a model switch,
attachment, ChatGPT tool, or persistent session; an explicit `Keep logged out` / `保持登出狀態`
control keeps the browser in guest mode.

## Continue

When the user identifies an earlier subject, title, or session id and asks to continue, use
mcp__gpt_relay__continue rather than creating an unrelated conversation.

Guest sessions have no stable conversation URL and cannot be continued. Report
`GUEST_SESSION_NOT_CONTINUABLE` rather than starting a different conversation.

## Poll

When the user asks for progress on a previously started task, use mcp__gpt_relay__poll instead
of resending the task.

Do not poll guest sessions; report `GUEST_SESSION_NOT_CONTINUABLE`.

## Safety

- Explicit selection of GPT Relay authorizes relay of the task.
- Only relay local file paths that the user explicitly included or clearly referred to.
- If ChatGPT is unavailable, report the relay issue rather than silently falling back to Codex.
