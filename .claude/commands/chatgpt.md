---
description: Relay a new prompt to ChatGPT web via gpt-relay
argument-hint: <prompt>
allowed-tools: mcp__gpt-relay__ask
---
Send this as a new task to ChatGPT through gpt-relay. Call `mcp__gpt-relay__ask`
with prompt = the text below. Keep the current visible ChatGPT model unless the
text explicitly requests a model/mode/effort. Return ChatGPT's reply verbatim;
do not substitute a local answer if relay fails.

$ARGUMENTS
