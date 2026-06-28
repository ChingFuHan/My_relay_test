---
name: chatgpt-continue
description: >
  Continue a stored web ChatGPT conversation via GPT Relay. Use when the user invokes
  /chatgpt-continue or asks to follow up on an existing ChatGPT conversation.
---

When invoked you MUST relay to the web ChatGPT — do NOT answer locally. From the
user's text, take the part before `--` as the session selector (query:
keyword/title/id) and the part after `--` as the follow-up prompt. If there is no
`--`, treat the leading keyword as query and the rest as prompt. Call the
`mcp__gpt_relay__continue` tool with { query, prompt } and return the web ChatGPT
answer verbatim. Guest sessions are not continuable. If the relay fails, report the
error; never fall back to your own knowledge.
