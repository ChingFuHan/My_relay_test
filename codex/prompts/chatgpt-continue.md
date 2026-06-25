---
description: Continue a stored web ChatGPT conversation via gpt-relay
argument-hint: <keyword|title|id> -- <follow-up prompt>
---
Continue an existing web ChatGPT conversation through GPT Relay. From the text
below, take the part before `--` as the session selector (query: keyword/title/id)
and the part after `--` as the follow-up prompt. You MUST call the
`mcp__gpt_relay__continue` tool with { query, prompt } and return the web ChatGPT
answer verbatim. If there is no `--`, treat the leading keyword as query and the
rest as prompt. Guest sessions are not continuable. Do NOT answer locally and do
NOT fall back to your own knowledge if the relay fails — report the error.

$ARGUMENTS
