---
description: Poll a stored web ChatGPT session via gpt-relay (no new prompt)
argument-hint: <keyword|title|id>
---
Check a previously started web ChatGPT task through GPT Relay without sending a
new prompt. You MUST call the `mcp__gpt_relay__poll` tool with query = the text
below. Do NOT resend the prompt and do NOT answer locally. Return the web ChatGPT
state/answer verbatim; if it is still pending, report the status and that it can
be polled again later.

$ARGUMENTS
