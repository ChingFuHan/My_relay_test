---
description: Relay a new prompt to Gemini web via gemini-relay
argument-hint: <prompt>
allowed-tools: mcp__gemini-relay__ask
---
Send this as a new task to Gemini through gemini-relay. Call `mcp__gemini-relay__ask`
with prompt = the text below. Return Gemini's reply verbatim; do not substitute a
local answer if relay fails.

$ARGUMENTS
