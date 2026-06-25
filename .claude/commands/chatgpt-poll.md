---
description: Poll a stored long-running gpt-relay session
argument-hint: <keyword|title|id>
allowed-tools: mcp__gpt-relay__poll
---
Check progress of a previously started ChatGPT task. Call `mcp__gpt-relay__poll`
with query = the text below. Do not resend the prompt. If still pending, report
status and that it can be polled again later.

$ARGUMENTS
