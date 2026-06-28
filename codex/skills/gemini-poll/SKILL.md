---
name: gemini-poll
description: >
  Re-read a stored web Gemini session via Gemini Relay without sending a new prompt.
  Use when the user invokes /gemini-poll or asks to check a stored Gemini session.
---

When invoked you MUST call the `mcp__gemini_relay__poll` tool with query = the user's
text. Do NOT resend a prompt and do NOT answer locally. Return the latest web Gemini
answer and the session status verbatim.
