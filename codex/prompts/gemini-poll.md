---
description: Poll a stored web Gemini session via gemini-relay (no new prompt)
argument-hint: <keyword|title|id>
---
Re-read a stored web Gemini conversation through Gemini Relay without sending a
new prompt. You MUST call the `mcp__gemini_relay__poll` tool with query = the text
below. Do NOT resend a prompt and do NOT answer locally. Return the latest web
Gemini answer and the session status verbatim.

$ARGUMENTS
