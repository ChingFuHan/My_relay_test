import assert from "node:assert/strict";
import test from "node:test";
import {
  createMcpHandler,
  runTool,
  toolResult,
} from "./mcp_server.mjs";

test("initialize returns gemini-relay server info", async () => {
  const handle = createMcpHandler();
  const initialized = await handle({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
  });

  assert.equal(initialized.result.serverInfo.name, "gemini-relay");
  assert.equal(initialized.result.serverInfo.version, "0.1.0");
});

test("tools/list exposes ask, continue, poll, list_sessions", async () => {
  const handle = createMcpHandler();
  const response = await handle({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
  });

  assert.deepEqual(response.result.tools.map((tool) => tool.name), [
    "ask",
    "continue",
    "poll",
    "list_sessions",
  ]);
});

test("runTool ask forwards prompt and timeout", async () => {
  let received = null;
  const result = await runTool(
    "ask",
    { prompt: "ping", timeout_ms: 1234 },
    {
      ask: async (input) => {
        received = input;
        return {
          status: "complete",
          finalDeliveryText: "pong",
        };
      },
    }
  );

  assert.deepEqual(received, {
    prompt: "ping",
    timeoutMs: 1234,
    keepTab: true,
  });
  assert.equal(result.finalDeliveryText, "pong");
});

test("runTool continue forwards query and prompt", async () => {
  let received = null;
  await runTool(
    "continue",
    { query: "design review", prompt: "and the tests?", timeout_ms: 999 },
    {
      continue: async (input) => {
        received = input;
        return { status: "complete", finalDeliveryText: "ok" };
      },
    }
  );

  assert.deepEqual(received, {
    query: "design review",
    prompt: "and the tests?",
    timeoutMs: 999,
    keepTab: true,
  });
});

test("runTool poll forwards query without prompt", async () => {
  let received = null;
  await runTool(
    "poll",
    { query: "abc123" },
    {
      poll: async (input) => {
        received = input;
        return { status: "complete", finalDeliveryText: "ok" };
      },
    }
  );

  assert.deepEqual(received, { query: "abc123", timeoutMs: undefined });
});

test("runTool list_sessions forwards query and limit", async () => {
  let received = null;
  await runTool(
    "list_sessions",
    { query: "design", limit: 5 },
    {
      list: async (input) => {
        received = input;
        return [];
      },
    }
  );

  assert.deepEqual(received, { query: "design", limit: 5 });
});

test("toolResult returns complete relay text", () => {
  assert.equal(
    toolResult({ status: "complete", finalDeliveryText: "Answer from Gemini" }).content[0].text,
    "Answer from Gemini"
  );
});

test("unknown tool throws", async () => {
  await assert.rejects(
    () => runTool("delete_everything", {}, { ask: async () => ({}) }),
    /Unknown Gemini Relay tool/
  );
});
