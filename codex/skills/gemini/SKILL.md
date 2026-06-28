---
name: gemini
description: >
  Relay the user's request to the web Gemini via Gemini Relay and return its answer
  verbatim. Use when the user invokes /gemini or explicitly asks to send a task to
  the web Gemini.
---

When invoked you MUST relay to the web Gemini — do NOT answer from your own
knowledge. Call the `mcp__gemini_relay__ask` tool with prompt = the user's text that
follows the command. Wait for the web Gemini answer and return it verbatim. If the
relay is slow or fails, report the relay error; never substitute a local answer.
