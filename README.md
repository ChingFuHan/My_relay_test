# GPT Relay Codex Plugin

[中文说明](./README.zh-Hant.md) | [English details](./README.en.md)

GPT Relay is a Codex plugin that relays prompts from Codex to ChatGPT through your existing Chrome session, then returns the completed ChatGPT response, generated images, Deep Research reports, and conversation links back to Codex.

It is designed for users who want Codex to ask ChatGPT with visible ChatGPT Intelligence options such as GPT 5.5 Pro Extended, GPT 5.4 Thinking Light, Deep Research, web search, image generation, and file uploads.

> This is an independent community plugin by Prompt Case. It is not an official OpenAI or ChatGPT product.

## Demo

### Codex Install Screen

![GPT Relay install screen](./media/plugin-install-screen.png)

### Codex and ChatGPT Side-by-Side

The video below shows Codex calling GPT Relay while Chrome opens ChatGPT, switches the requested visible model/mode/effort, sends the prompt, and returns the result.

<video src="./media/gpt-relay-demo.mp4" controls width="100%"></video>

[Open the demo video](./media/gpt-relay-demo.mp4)

## Install

Run these commands in your Codex environment:

```bash
codex plugin marketplace add Toolsai/GPT-Relay-Codex-Plugin-
codex plugin add gpt-5-5-pro-relay@gpt-relay
```

Then start a new Codex thread so the plugin skill is loaded.

## Requirements

- Codex with plugin support.
- Chrome plugin / Chrome automation available in Codex.
- A logged-in ChatGPT session in Chrome.
- Your ChatGPT account must have access to the model or mode you request. For example, Pro mode requires a ChatGPT Pro account.

## What It Can Do

- Keep your current ChatGPT Intelligence selection when you do not request a model change.
- Switch visible ChatGPT Intelligence options when requested, such as `5.5 Pro Extended` or `5.4 Thinking Light`.
- Refuse clearly when the requested option is not visible in your account, instead of silently falling back to another model.
- Send prompts and supported file attachments to ChatGPT.
- Return ChatGPT replies as normal Markdown, preserving headings, lists, tables, links, and code blocks where possible.
- Return generated images as local image artifacts.
- Export completed Deep Research reports to Markdown artifacts.
- Keep session metadata so you can continue or poll long-running ChatGPT tasks.

## Example Prompts

```text
Use GPT 5.5 Pro Extended to analyze this question: ...
```

```text
Run Deep Research on this topic: ...
```

```text
Switch to GPT 5.4 Thinking Light and analyze this image.
```

## Update

To update the marketplace source later:

```bash
codex plugin marketplace upgrade gpt-relay
codex plugin add gpt-5-5-pro-relay@gpt-relay
```

Start a new Codex thread after updating.

## Notes

- GPT Relay operates through the visible ChatGPT web UI. If ChatGPT changes its UI, selectors may need updates.
- The plugin reports the visible model/mode/effort selected in ChatGPT. It does not claim hidden backend state.
- It will stop on login prompts, CAPTCHA, permission dialogs, or unavailable account features.
