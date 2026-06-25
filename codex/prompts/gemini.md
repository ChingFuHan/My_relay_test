---
description: Relay a new prompt to web Gemini via gemini-relay
argument-hint: <prompt>
---
Relay this task to the web Gemini through Gemini Relay. You MUST call the
`mcp__gemini_relay__ask` tool with prompt = the text below, wait for the web
Gemini answer, and return it verbatim. Do NOT answer from your own knowledge, and
do NOT substitute a local answer if the relay is slow or fails — report the relay
error instead.

$ARGUMENTS
