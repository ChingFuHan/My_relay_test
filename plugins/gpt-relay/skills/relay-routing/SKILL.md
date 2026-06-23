---
name: relay-routing
description: Use when the user starts the message with /chatgpt, /gpt, /codex, /chatgpt-continue, or /chatgpt-poll to make the execution target explicit.
---

# Relay Routing

This skill defines slash-style routing commands so the user can explicitly choose whether Codex
or ChatGPT should handle the work.

## Supported Slash Commands

### `/codex`

Meaning: keep the work in Codex only.

Behavior:

1. Strip the `/codex` prefix.
2. Treat the remainder as a normal Codex task.
3. Do not relay to ChatGPT unless the user later asks for it explicitly.

### `/chatgpt`

Meaning: relay the task to ChatGPT through GPT Relay.

Behavior:

1. Strip the `/chatgpt` prefix.
2. Send the remaining prompt through GPT Relay.
3. Keep the current visible ChatGPT Intelligence selection unless the user explicitly requests a
   different visible model/mode/effort.
4. If relay returns a complete `finalDeliveryText`, final answer must be that text verbatim.

### `/gpt`

Alias of `/chatgpt`.

### `/chatgpt-continue`

Meaning: continue a previously stored GPT Relay conversation.

Behavior:

1. Strip the `/chatgpt-continue` prefix.
2. Use `continueExtendedProRelay(...)` instead of starting a new conversation.
3. Treat the remainder as continuation instruction plus optional session hint.

Suggested input shapes:

- `/chatgpt-continue query=repo audit :: continue from the previous summary`
- `/chatgpt-continue session=relay-123 :: now focus on security findings`

### `/chatgpt-poll`

Meaning: poll an existing GPT Relay session instead of resending the prompt.

Behavior:

1. Strip the `/chatgpt-poll` prefix.
2. Use `pollRelaySession(...)`.
3. Treat the remainder as a query or session selector.

Examples:

- `/chatgpt-poll query=deep research`
- `/chatgpt-poll relay-123`

## Parsing Rules

- Slash command must be at the start of the message.
- Strip only the first routing prefix.
- If the remainder is empty, ask the user what should be sent to that target.
- `/chatgpt` and `/gpt` choose ChatGPT as executor.
- `/codex` chooses Codex as executor.

## Safety

- `/chatgpt` authorizes relay of the remainder of the prompt.
- Only relay local file paths when the user explicitly included them or clearly referred to them.
- If ChatGPT is unavailable, do not silently fall back from `/chatgpt` to `/codex`; report the
  relay issue and wait for the user's direction.
