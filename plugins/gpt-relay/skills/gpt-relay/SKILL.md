---
name: gpt-relay
description: Use when the user explicitly asks to send, relay, or ask ChatGPT to do work and return its answer in Codex, including GPT 5.5 Pro, Extended Pro, or similar wording.
---

# GPT Relay

This skill relays a Codex task to ChatGPT through the user's existing Chrome session.
By default it keeps the user's current visible ChatGPT Intelligence selection. Only change the
model, mode, or effort when the user explicitly requests a visible combination such as
`5.5 Pro extended`, `5.5 Thinking light`, or `5.4 Instant`.

## What It Does

Use the helper script at `../../scripts/chatgpt_relay.mjs` to:

1. Open a new ChatGPT tab.
2. Ensure the composer is available.
3. Select the requested ChatGPT Intelligence model/mode/effort only when explicitly requested; otherwise keep the current ChatGPT selection.
4. Attach optional local images/files through ChatGPT's visible upload controls first.
5. For image attachments, wait until the attachment UI is stable for 5 seconds and no upload/processing status is visible before sending.
6. Send the user's prompt.
7. Wait until ChatGPT finishes answering; do not answer the user's task from Codex while ChatGPT is still running.
8. Return the complete assistant delivery to Codex: full text with Markdown formatting preserved when possible, generated images, Deep Research reports, and any saved artifact paths.
9. Keep the ChatGPT tab open by default for follow-up use.
10. Store session metadata, URL, summary, keywords, status, and artifacts for signed-in conversations. Guest chats have no stable conversation URL.
11. Save a signed-in `pending` session immediately after ChatGPT creates the `/c/...` conversation URL, before waiting for the final answer.
12. For Create image tasks, treat generated image artifacts as a valid completion signal even when the assistant text is empty.
13. Save generated images locally and return `imageMarkdown` lines that can be rendered in the Codex conversation.
14. For Deep Research tasks, treat `Research completed in ... · ... citations · ... searches` as the completion signal, then open the report viewer, export Markdown, validate it, and return the Markdown artifact.

## Required Setup

This skill supports either the Codex Chrome extension runtime or the configured `host-bridge`.
For a Linux VM/Windows host setup, use `GPT_RELAY_BROWSER_PROVIDER=host-bridge` with the
bridge URL and token. This path can run from an ordinary Node process; it does not require a
special Codex browser tool in the current session.

The helper auto-bootstraps the bundled Chrome plugin when `globalThis.browser` is missing.
If auto-bootstrap fails, report the helper error code and ask the user to ensure the Chrome plugin is installed and the Codex Chrome extension is connected.

Do not inspect cookies, local storage, passwords, or browser session stores.

The preferred session store is `~/.codex/gpt-relay/sessions.json`.
If the runtime cannot write there, the helper falls back to `nodeRepl.tmpDir` and returns `session.stateWarning`; this is degraded persistence, not a relay failure. Later session lookup also checks that fallback store when no explicit `statePath` is supplied.

## ChatGPT Access Modes

Inspect the visible ChatGPT state before selecting a workflow:

| State | Allowed workflow | Required handling |
| --- | --- | --- |
| `guest` | Plain-text new task only. | Use the visible `Keep logged out` / `保持登出狀態` control when it appears. Do not request a model switch, attachment, ChatGPT tool, continuation, polling, or conversation URL. |
| `logged-in` | Account-visible models and supported features. | Use persistent session, continuation, and polling only when ChatGPT exposes them. |
| `guest-or-logged-out` | No relay. | Report `CHATGPT_LOGIN_REQUIRED`; do not click sign-in controls. |
| `verification-required` | No relay. | Report the visible verification/CAPTCHA state. |
| `unknown` | A new plain-text task only if the composer is visibly usable. | Do not infer account capabilities. |

## Trigger Handling

When the user mentions phrases such as:

- `5.5 pro`
- `GPT 5.5`
- `GPT 5.5 Pro`
- `Extended Pro`
- `Pro Extended`
- `pro extend think`
- `5.5 thinking light`
- `5.4 instant`
- `5.5 pro standard`
- `5.5 pro extended`
interpret that as a request to use this relay, unless the user is only asking a conceptual question.

When the user asks to continue, reopen, list, search, resume, poll, or check an earlier signed-in GPT 5.5 Pro conversation, use the exported session helpers instead of starting a new unrelated chat. Guest chats are not continuable.

## Safety Boundaries

- The user's prompt is authorized to send when they explicitly ask to relay it to GPT 5.5 Pro.
- For files, only attach local absolute file paths that the user provided or that are clearly attached to the current request.
- Images and documents are uploaded through ChatGPT's visible `Add photos & files` / file input controls by default.
- Do not pre-compress images unless the user explicitly asks for compression.
- Clipboard image paste is only a fallback for small images after upload paths fail.
- For large images, do not fall back to native clipboard paste automatically; report the upload permission blocker so the user can fix the real upload path.
- If the relay returns `ATTACHMENT_UPLOAD_PERMISSION_REQUIRED`, report the two permission gates: Codex Chrome Uploads and Chrome extension `Allow access to file URLs`.
- If the relay returns `ATTACHMENT_UPLOAD_NOT_CONFIRMED` or `IMAGE_ATTACHMENT_NOT_CONFIRMED`, report that ChatGPT did not visibly accept the attachment and do not answer the attachment task from Codex.
- Text-like files are uploaded by default. To embed a text file into the prompt instead, pass `attachments: [{ path: "...", inline: true }]`.
- If a file path is ambiguous, ask for the path.
- For text-only guest relays, an explicit ChatGPT `Keep logged out` / `保持登出狀態` welcome control may be used to remain in guest mode. Stop and report any other login, CAPTCHA, payment, permission, or account prompt.
- Guest chats do not expose a stable conversation URL; do not attempt continuation or polling for them.
- If the relay fails, do not answer with another model, web search, or local reasoning unless the user explicitly asks for a fallback.
- If ChatGPT is still answering, keep waiting or poll the same session; never substitute a local Codex answer for the requested GPT 5.5 Pro answer.
- Do not solve CAPTCHA or accept browser permission prompts automatically.
- Do not claim the backend model name from hidden state. Report only the visible ChatGPT Intelligence selection that the helper requested or observed.
- Not every model exposes every reasoning mode. If ChatGPT does not show a requested combination, report `INTELLIGENCE_COMBINATION_UNAVAILABLE` instead of silently choosing a different model or effort.
- If the user does not explicitly ask to change the model, mode, or effort, keep the current ChatGPT selection. Do not force `5.5 Pro Extended`.
- Pro mode is the paid ChatGPT Pro Intelligence mode. It only exposes `Standard` and `Extended` effort. Do not request `Light` or `Heavy` for Pro mode.
- If the user requests Pro but the visible ChatGPT account does not expose Pro, report that Pro is unavailable and include the available models/modes/efforts from the helper error instead of falling back to another model.

## Preferred MCP Usage

Use the installed plugin MCP tools instead of shell commands whenever they are available:

- mcp__gpt_relay__ask for a new task.
- mcp__gpt_relay__continue for a stored conversation.
- mcp__gpt_relay__poll to check an existing task.
- mcp__gpt_relay__list_sessions to find stored tasks.

The MCP server reads ~/.config/gpt-relay/env.sh when Codex did not inherit the bridge
environment. Use the MCP tools first because they avoid the Codex shell sandbox and work from any
repository after the plugin is installed.

If a tool returns a completed finalDeliveryText, return that text exactly as the final answer.
If it returns an error, report the relay error without substituting a Codex answer.

## CLI Fallback

Use the bundled CLI from the installed plugin with the normal shell tool. This works from any
repository as long as the plugin and bridge environment are installed:

```bash
node "<plugin-root>/scripts/chatgpt_cli.mjs" ask --prompt "User prompt here"
```

For a signed-in continuation or pending task:

```bash
node "<plugin-root>/scripts/chatgpt_cli.mjs" continue \
  --query "高達模型" \
  --prompt "請接著整理模型比例與入門建議。"

node "<plugin-root>/scripts/chatgpt_cli.mjs" poll --query "高達模型"
```

The CLI prints `finalDeliveryText` verbatim when a relay completes. It prints JSON for pending
or diagnostic results. Do not use a local Codex answer as a fallback when the user selected
ChatGPT.

## Node REPL Usage

```js
const { runExtendedProRelay } = await import("/absolute/path/to/plugin/scripts/chatgpt_relay.mjs");
const result = await runExtendedProRelay({
  prompt: "User prompt here",
  filePaths: [],
  keepTab: true,
  waitChunkMs: 90000,
  timeoutMs: 6 * 60 * 60 * 1000,
  returnPending: false
});
nodeRepl.write(result.finalDeliveryText ?? result.finalResponseText);
```

CRITICAL FINAL OUTPUT RULE:
If any relay helper returns `status: "complete"`, `mustReturnFinalDelivery: true` or
`mustReturnVerbatim: true`, and a non-empty `finalDeliveryText`, the Codex final answer MUST be
exactly `result.finalDeliveryText`.
Do not add a summary before it. Do not shorten it. Do not rewrite it. Do not omit lines.
Do not wrap it in JSON or Markdown commentary. Do not replace it with key points.
The `finalDeliveryText` field already contains the complete ChatGPT assistant text, generated
image Markdown, saved non-image artifact paths, and a conversation link when ChatGPT exposes one.
For ordinary assistant answers, it should preserve ChatGPT-rendered Markdown structure such as
headings, lists, tables, links, inline formatting, and original code blocks. Do not wrap the whole
answer in a code block.
`finalResponseText` is kept only as a text-only compatibility/debug field; do not use it as the
final answer when `finalDeliveryText` is available.

Before sending the final response, perform this check:

- Did this turn use `runExtendedProRelay`, `pollRelaySession`, or `continueExtendedProRelay`?
- Is `(result.mustReturnFinalDelivery === true || result.mustReturnVerbatim === true)` and `result.finalDeliveryText` available?
- If yes, final answer = `result.finalDeliveryText` verbatim.
- If `result.imageMarkdown`, `result.reportMarkdown`, or `result.artifacts` exist, confirm they are represented in `result.finalDeliveryText`; only expect a conversation link for a persistent signed-in chat.
- If you are about to summarize, stop and paste `result.finalDeliveryText` instead.

When calling this helper through `node_repl`, set the tool call timeout high enough for the expected ChatGPT runtime. Do not omit the tool timeout for long Pro jobs. Use at least 30 minutes when the user asks for patient waiting.

Select a visible ChatGPT Intelligence combination explicitly:

```js
const result = await runExtendedProRelay({
  prompt: "User prompt here",
  model: "5.5",
  mode: "thinking",
  effort: "light",
  keepTab: true,
  timeoutMs: 30 * 60 * 1000
});
nodeRepl.write(result.finalDeliveryText ?? result.finalResponseText);
```

The helper can also infer common phrases from the prompt, such as `GPT 5.5 Thinking light`, `5.4 Instant`, or `Pro extended`. The plugin name `GPT Relay` alone does not count as a request to change models. If a requested combination is not visible in a signed-in ChatGPT account, poll or report the error with the available options; do not resubmit the task with a different model. In guest mode, do not request account-only combinations.

If a signed-in outer tool call still times out, do not answer the user's task from Codex. Use `listRelaySessions` or `pollRelaySession` to recover the stored pending conversation and continue waiting. Guest sessions cannot be recovered this way.

Use an absolute import path resolved from this skill file:

```text
<plugin-root>/scripts/chatgpt_relay.mjs
```

Continue a previous signed-in conversation:

```js
const { continueExtendedProRelay } = await import("/absolute/path/to/plugin/scripts/chatgpt_relay.mjs");
const result = await continueExtendedProRelay({
  query: "高達模型",
  prompt: "請接著整理模型比例與入門建議。"
});
nodeRepl.write(result.finalDeliveryText ?? result.finalResponseText);
```

List or search stored sessions:

```js
const { listRelaySessions } = await import("/absolute/path/to/plugin/scripts/chatgpt_relay.mjs");
const sessions = await listRelaySessions({ query: "高達", limit: 10 });
nodeRepl.write(JSON.stringify(sessions, null, 2));
```

Check a long-running session after an outer tool timeout or when the user explicitly asked to background the work:

```js
const { pollRelaySession } = await import("/absolute/path/to/plugin/scripts/chatgpt_relay.mjs");
const result = await pollRelaySession({
  query: "高達",
  timeoutMs: 30 * 60 * 1000
});
nodeRepl.write(result.finalDeliveryText ?? result.finalResponseText);
```

If `status` is still `pending`, repeat `pollRelaySession` later. Do not resubmit the original prompt unless the user explicitly requests a new GPT run.

Start a long-running session and return a resumable `pending` result after one short wait:

```js
const { startExtendedProRelay } = await import("/absolute/path/to/plugin/scripts/chatgpt_relay.mjs");
const result = await startExtendedProRelay({
  prompt: "Long prompt here",
  keepTab: true
});
nodeRepl.write(JSON.stringify(result, null, 2));
```

Use a GPT App mention:

```js
await runExtendedProRelay({
  appName: "Canva",
  prompt: "Create a clean poster concept for this campaign."
});
```

Use ChatGPT tools:

```js
await runExtendedProRelay({
  feature: "deep-research",
  prompt: "Research the topic and return a structured report."
});

await runExtendedProRelay({
  feature: "create-image",
  prompt: "Create an image of a futuristic Gundam hangar."
});

await runExtendedProRelay({
  projectName: "Image Gen",
  prompt: "Continue inside this project."
});
```

When `feature: "deep-research"` completes, return `finalDeliveryText` as the final Codex answer.
It contains the full report Markdown and the conversation URL. The helper also returns `reportMarkdown`,
`deepResearch`, and an artifact like:

```json
{
  "kind": "deep-research-report",
  "localPath": "/absolute/path/deep-research-report.md",
  "mimeType": "text/markdown"
}
```

If a Deep Research job was started earlier, call `pollRelaySession` with the session id, title, or keywords. The helper first tries to claim the original Chrome tab before opening the stored conversation URL.

When `feature: "create-image"` completes, return `finalDeliveryText` as the final Codex answer.
It contains the generated image Markdown line(s), optional assistant text, and the conversation URL.
The helper also returns `artifacts` with `localPath` and `imageMarkdown` for inspection:

```markdown
![generated image 1](/absolute/path/to/image-01.png)
```

If `status` is `pending` but the user's browser visibly shows a generated image, call `pollRelaySession` again. The optimized helper can complete image-only responses once the generated image artifact is stable.

Attach an original image or document:

```js
await runExtendedProRelay({
  prompt: "Analyze this image.",
  attachments: [{ path: "/absolute/path/image.png" }],
  keepTab: true,
  waitChunkMs: 90000,
  timeoutMs: 6 * 60 * 60 * 1000,
  returnPending: false
});
```

## Response Shape

The helper returns:

```json
{
  "ok": true,
  "status": "complete",
  "mode": "5.5 Thinking Light",
  "intelligence": {
    "model": "5.5",
    "mode": "thinking",
    "effort": "light"
  },
  "assistantText": "...",
  "reportMarkdown": "...",
  "finalResponseText": "...\\n\\nConversation URL: https://chatgpt.com/c/...",
  "finalDeliveryText": "...\\n\\n![generated image 1](/absolute/path/image-01.png)\\n\\nArtifacts:\\n- report: /absolute/path/report.md\\n\\nConversation URL: https://chatgpt.com/c/...",
  "mustReturnFinalDelivery": true,
  "finalDeliveryField": "finalDeliveryText",
  "deepResearch": {},
  "conversationUrl": "https://chatgpt.com/c/...",
  "title": "...",
  "session": {},
  "artifacts": [],
  "imageMarkdown": [],
  "messages": []
}
```

Only when `returnPending: true` is explicitly requested, the helper may return:

```json
{
  "ok": true,
  "status": "pending",
  "assistantText": "",
  "conversationUrl": "https://chatgpt.com/c/...",
  "session": {}
}
```

When status is `pending`, keep the tab open and later call `pollRelaySession`. Do not write an answer to the user's original prompt from Codex.

If it cannot continue, it throws an error with a stable code such as:

- `CHROME_BROWSER_MISSING`
- `CHROME_BROWSER_CLIENT_MISSING`
- `CHATGPT_COMPOSER_MISSING`
- `INTELLIGENCE_COMBINATION_UNAVAILABLE`
- `ATTACHMENT_UPLOAD_FAILED`
- `ATTACHMENT_UPLOAD_PERMISSION_REQUIRED`
- `ATTACHMENT_UPLOAD_NOT_CONFIRMED`
- `IMAGE_CLIPBOARD_TOO_LARGE` when an explicit image size limit was configured for fallback paste
- `IMAGE_CLIPBOARD_PASTE_FAILED`
- `IMAGE_ATTACHMENT_NOT_CONFIRMED`
- `FEATURE_CONTROL_UNAVAILABLE`
- `PROJECT_UNAVAILABLE`
- `SESSION_NOT_FOUND`
- `CHATGPT_RESPONSE_TIMEOUT`
- `DEEP_RESEARCH_COMPLETED_CARD_NOT_OPENABLE`
- `DEEP_RESEARCH_VIEWER_OPEN_FAILED`
- `DEEP_RESEARCH_EXPORT_MENU_MISSING`
- `DEEP_RESEARCH_MARKDOWN_EXPORT_MISSING`
- `DEEP_RESEARCH_MARKDOWN_DOWNLOAD_TIMEOUT`
- `DEEP_RESEARCH_REPORT_VALIDATION_FAILED`

Report these errors in natural language and include the practical next step.
