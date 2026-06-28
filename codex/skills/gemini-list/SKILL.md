---
name: gemini-list
description: >
  List stored web Gemini sessions via Gemini Relay. Use when the user invokes
  /gemini-list or asks which Gemini conversations are stored.
---

When invoked you MUST call the `mcp__gemini_relay__list_sessions` tool with query =
the user's text (omit if empty). Show title, status, and any conversation URL. Do not
invent sessions; report exactly what the tool returns.
