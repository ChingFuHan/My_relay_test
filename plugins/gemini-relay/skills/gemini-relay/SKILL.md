---
name: gemini-relay
description: Use when the user explicitly asks to send, relay, or ask Gemini to do work and return its answer in Codex.
---

# Gemini Relay

This skill relays a Codex task to Gemini through the user's existing Chrome session.

## Default Behavior

1. Open a new Gemini tab.
2. Inspect Gemini access state before sending anything.
3. If Gemini exposes an interactive signed-out composer, allow a plain-text guest relay.
4. Send the prompt and wait for Gemini to finish.
5. Return Gemini's completed answer verbatim.
6. Keep the Gemini tab open by default for manual follow-up.
7. For a signed-in chat, a conversation URL is captured and stored, so the task can later be continued or polled. Guest chats are text-only and cannot be continued.

## Gemini Access Modes

Inspect visible Gemini state before choosing a workflow:

| State | Meaning | Allowed |
| --- | --- | --- |
| `guest` | Gemini exposes a usable signed-out composer. | Plain-text new task only. No attachments, image generation, model switching, continuation, or polling (no stable conversation URL). |
| `logged-in` | Gemini appears signed in and ready. | Plain-text new task; conversation is stored so it can be continued or polled. |
| `guest-or-logged-out` | Sign-in wall or signed-out landing page without safe composer. | No relay. Report `GEMINI_LOGIN_REQUIRED`. Do not click sign-in controls. |
| `verification-required` | CAPTCHA or human verification visible. | No relay. Report `GEMINI_VERIFICATION_REQUIRED`. |

## Constraints

- Text-first only: no attachments, image generation, or model switching.
- Continuation and polling require a signed-in conversation URL; guest chats cannot be continued.
- If Gemini is unavailable, report the relay issue rather than silently falling back to a local answer.
- Return the final Gemini answer exactly from `finalDeliveryText`.
