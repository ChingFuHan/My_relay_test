---
description: Relay a new prompt to web ChatGPT via gpt-relay
argument-hint: <prompt>
---
Relay this task to the web ChatGPT through GPT Relay. You MUST call the
`mcp__gpt_relay__ask` tool with prompt = the text below, wait for the web ChatGPT
answer, and return it verbatim. Do NOT answer from your own knowledge, and do NOT
substitute a local answer if the relay is slow or fails — report the relay error
instead. Keep the currently visible ChatGPT model unless the text explicitly
requests a model/mode/effort.

$ARGUMENTS
