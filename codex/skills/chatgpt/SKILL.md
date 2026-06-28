---
name: chatgpt
description: >
  Relay the user's request to the web ChatGPT via GPT Relay and return its answer
  verbatim. Use when the user invokes /chatgpt or explicitly asks to send a task to
  the web ChatGPT.
---

When invoked you MUST relay to the web ChatGPT — do NOT answer from your own
knowledge. Call the `mcp__gpt_relay__ask` tool with prompt = the user's text that
follows the command. Keep the currently visible ChatGPT model unless the text
explicitly requests a model/mode/effort. Wait for the web ChatGPT answer and return
it verbatim. If the relay is slow or fails, report the relay error; never substitute
a local answer.
