import assert from "node:assert/strict";
import test from "node:test";
import { createMcpHandler, runTool, toolResult } from "./mcp_server.mjs";

test("MCP initialize and tool list are valid JSON-RPC responses", async () => {
  const handle = createMcpHandler();
  const initialized = await handle({ jsonrpc: "2.0", id: 1, method: "initialize" });
  const tools = await handle({ jsonrpc: "2.0", id: 2, method: "tools/list" });

  assert.equal(initialized.result.serverInfo.name, "gpt-relay");
  assert.deepEqual(tools.result.tools.map((tool) => tool.name), [
    "ask",
    "continue",
    "poll",
    "list_sessions",
  ]);
});

test("ask maps MCP fields to the relay request", async () => {
  let received;
  const relay = {
    ask: async (value) => {
      received = value;
      return { status: "complete", finalDeliveryText: "PLUGIN_OK" };
    },
  };

  const result = await runTool("ask", {
    prompt: "請只回覆 PLUGIN_OK。",
    timeout_ms: 60000,
    return_pending: true,
  }, relay);

  assert.equal(result.finalDeliveryText, "PLUGIN_OK");
  assert.deepEqual(received, {
    prompt: "請只回覆 PLUGIN_OK。",
    feature: undefined,
    model: undefined,
    mode: undefined,
    effort: undefined,
    timeoutMs: 60000,
    returnPending: true,
    keepTab: true,
  });
});

test("complete relay output is exposed as the MCP text result", () => {
  assert.equal(
    toolResult({ status: "complete", finalDeliveryText: "Answer from ChatGPT" }).content[0].text,
    "Answer from ChatGPT"
  );
});

test("MCP tool calls return relay failures without falling back", async () => {
  const handle = createMcpHandler({
    ask: async () => {
      const error = new Error("Bridge is unavailable.");
      error.code = "HOST_BRIDGE_UNAVAILABLE";
      throw error;
    },
  });

  const response = await handle({
    jsonrpc: "2.0",
    id: 7,
    method: "tools/call",
    params: { name: "ask", arguments: { prompt: "test" } },
  });

  assert.equal(response.result.isError, true);
  assert.match(response.result.content[0].text, /HOST_BRIDGE_UNAVAILABLE/);
});

test("MCP input validation rejects an empty prompt", async () => {
  await assert.rejects(
    runTool("ask", { prompt: " " }, { ask: async () => ({}) }),
    { code: "INPUT_INVALID" }
  );
});
