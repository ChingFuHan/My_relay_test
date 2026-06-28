---
name: chatgpt-poll
description: >
  Re-read a stored web ChatGPT session via GPT Relay without sending a new prompt.
  Use when the user invokes /chatgpt-poll or asks to check a previously started
  ChatGPT task.
---

When invoked you MUST call the `mcp__gpt_relay__poll` tool with query = the user's
text. Do NOT resend a prompt and do NOT answer locally. Return the web ChatGPT
state/answer verbatim; if it is still pending, report the status and that it can be
polled again later.
