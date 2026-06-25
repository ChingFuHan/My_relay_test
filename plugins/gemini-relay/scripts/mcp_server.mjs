#!/usr/bin/env node

import os from "node:os";
import readline from "node:readline";
import { pathToFileURL } from "node:url";
import {
  continueGeminiRelay,
  listGeminiSessions,
  pollGeminiRelay,
  runGeminiRelay,
} from "./gemini_relay.mjs";

// When launched outside a Codex Node REPL (e.g. by Claude Code or a plain
// `node` process) there is no `globalThis.nodeRepl`, so the relay cannot derive
// a session-store path and throws SESSION_STORE_PATH_MISSING. Provide one from
// GEMINI_RELAY_STATE_PATH (default under the OS temp dir) so the server is
// portable. Gate on `!nodeRepl` so Codex is never affected: under Codex the
// relay keeps deriving its own path (~/.codex/gemini-relay/sessions.json).
if (!globalThis.__geminiRelayStatePath && !globalThis.nodeRepl) {
  globalThis.__geminiRelayStatePath =
    process.env.GEMINI_RELAY_STATE_PATH ||
    `${os.tmpdir()}/gemini-relay/sessions.json`;
}

const PROTOCOL_VERSION = "2025-03-26";

const TOOLS = [
  {
    name: "ask",
    description:
      "Send a new plain-text task to Gemini through Gemini Relay and return its response.",
    inputSchema: objectSchema(
      {
        prompt: stringSchema("Task to send to Gemini."),
        timeout_ms: optionalIntegerSchema(
          "Maximum time to wait for Gemini, in milliseconds."
        ),
      },
      ["prompt"]
    ),
  },
  {
    name: "continue",
    description:
      "Continue a stored Gemini Relay conversation selected by query or session id.",
    inputSchema: objectSchema(
      {
        query: stringSchema("Stored session id, title, or query."),
        prompt: stringSchema("Follow-up task to send to Gemini."),
        timeout_ms: optionalIntegerSchema(
          "Maximum time to wait for Gemini, in milliseconds."
        ),
      },
      ["query", "prompt"]
    ),
  },
  {
    name: "poll",
    description:
      "Check a stored Gemini Relay session without sending a new prompt.",
    inputSchema: objectSchema(
      {
        query: stringSchema("Stored session id, title, or query."),
        timeout_ms: optionalIntegerSchema(
          "Maximum time to wait for Gemini, in milliseconds."
        ),
      },
      ["query"]
    ),
  },
  {
    name: "list_sessions",
    description:
      "List stored Gemini Relay sessions, optionally filtered by a query.",
    inputSchema: objectSchema({
      query: optionalStringSchema("Optional title or keyword filter."),
      limit: optionalIntegerSchema("Maximum number of sessions to return."),
    }),
  },
];

export function createMcpHandler(relay = defaultRelay()) {
  return async function handle(request) {
    if (!request || request.jsonrpc !== "2.0" || typeof request.method !== "string") {
      return errorResponse(request?.id ?? null, -32600, "Invalid JSON-RPC request.");
    }

    if (request.method === "notifications/initialized") {
      return null;
    }
    if (request.method === "initialize") {
      return resultResponse(request.id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "gemini-relay", version: "0.1.0" },
        instructions:
          "Use ask for a new Gemini task, continue for follow-ups on a stored conversation, poll to re-read a stored session, and list_sessions to browse history. Do not substitute a local answer when relay fails.",
      });
    }
    if (request.method === "ping") {
      return resultResponse(request.id, {});
    }
    if (request.method === "tools/list") {
      return resultResponse(request.id, { tools: TOOLS });
    }
    if (request.method === "tools/call") {
      return await callTool(request, relay);
    }
    return errorResponse(
      request.id ?? null,
      -32601,
      "Method not found: " + request.method
    );
  };
}

async function callTool(request, relay) {
  const name = request.params?.name;
  const input = request.params?.arguments ?? {};
  try {
    const result = await runTool(name, input, relay);
    return resultResponse(request.id, toolResult(result));
  } catch (error) {
    return resultResponse(request.id, {
      content: [{ type: "text", text: formatError(error) }],
      isError: true,
    });
  }
}

export async function runTool(name, input, relay = defaultRelay()) {
  switch (name) {
    case "ask":
      return await relay.ask({
        prompt: requiredString(input.prompt, "prompt"),
        timeoutMs: optionalPositiveInteger(input.timeout_ms, "timeout_ms"),
        keepTab: true,
      });
    case "continue":
      return await relay.continue({
        query: requiredString(input.query, "query"),
        prompt: requiredString(input.prompt, "prompt"),
        timeoutMs: optionalPositiveInteger(input.timeout_ms, "timeout_ms"),
        keepTab: true,
      });
    case "poll":
      return await relay.poll({
        query: requiredString(input.query, "query"),
        timeoutMs: optionalPositiveInteger(input.timeout_ms, "timeout_ms"),
      });
    case "list_sessions":
      return await relay.list({
        query: optionalString(input.query),
        limit: optionalPositiveInteger(input.limit, "limit"),
      });
    default:
      throw codedError("TOOL_NOT_FOUND", "Unknown Gemini Relay tool: " + String(name));
  }
}

export function toolResult(result) {
  return {
    content: [{ type: "text", text: resultText(result) }],
    structuredContent: result,
  };
}

function resultText(result) {
  if (result?.status === "complete") {
    return result.finalDeliveryText || result.finalResponseText || JSON.stringify(result, null, 2);
  }
  return JSON.stringify(result, null, 2);
}

function defaultRelay() {
  return {
    ask: runGeminiRelay,
    continue: continueGeminiRelay,
    poll: pollGeminiRelay,
    list: listGeminiSessions,
  };
}

function requiredString(value, name) {
  const text = optionalString(value);
  if (!text) {
    throw codedError("INPUT_INVALID", name + " must be a non-empty string.");
  }
  return text;
}

function optionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalPositiveInteger(value, name) {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!Number.isInteger(value) || value <= 0) {
    throw codedError("INPUT_INVALID", name + " must be a positive integer.");
  }
  return value;
}

function codedError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function formatError(error) {
  const code = error?.code ? " [" + error.code + "]" : "";
  return "Gemini Relay error" + code + ": " + (error?.message ?? String(error));
}

function resultResponse(id, result) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function errorResponse(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function stringSchema(description) {
  return { type: "string", description };
}

function optionalStringSchema(description) {
  return { type: "string", description };
}

function optionalIntegerSchema(description) {
  return { type: "integer", minimum: 1, description };
}

function objectSchema(properties, required = []) {
  return { type: "object", properties, required, additionalProperties: false };
}

async function main() {
  const handle = createMcpHandler();
  const reader = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of reader) {
    if (!line.trim()) {
      continue;
    }
    let response;
    try {
      response = await handle(JSON.parse(line));
    } catch (error) {
      response = errorResponse(
        null,
        -32700,
        "Parse error: " + (error?.message ?? String(error))
      );
    }
    if (response) {
      process.stdout.write(JSON.stringify(response) + "\n");
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
