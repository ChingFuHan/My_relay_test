---
name: chatgpt-list
description: >
  List stored web ChatGPT sessions via GPT Relay. Use when the user invokes
  /chatgpt-list or asks which ChatGPT conversations are stored.
---

When invoked you MUST call the `mcp__gpt_relay__list_sessions` tool with query = the
user's text (omit if empty). Show title, status, and any conversation URL. Do not
invent sessions; report exactly what the tool returns.
