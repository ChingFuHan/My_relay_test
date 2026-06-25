---
description: Continue a stored gemini-relay Gemini conversation
argument-hint: <keyword|title|id> -- <follow-up prompt>
allowed-tools: mcp__gemini-relay__continue
---
Continue an existing Gemini conversation through gemini-relay. From the text below,
take the part before `--` as the session selector (query: keyword/title/id) and
the part after `--` as the follow-up prompt, then call `mcp__gemini-relay__continue`
with { query, prompt }. If no `--`, treat the leading keyword as query and the
rest as prompt. Guest sessions are not continuable.

$ARGUMENTS
