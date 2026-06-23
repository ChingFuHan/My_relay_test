import assert from "node:assert/strict";
import test from "node:test";
import { parseCliArguments } from "./chatgpt_cli.mjs";

test("parseCliArguments parses ask options", () => {
  assert.deepEqual(
    parseCliArguments([
      "ask",
      "--prompt",
      "請只回覆 OK。",
      "--feature",
      "create-image",
      "--timeout-ms",
      "60000",
      "--return-pending",
    ]),
    {
      command: "ask",
      json: false,
      returnPending: true,
      prompt: "請只回覆 OK。",
      query: "",
      feature: "create-image",
      model: "",
      mode: "",
      effort: "",
      timeoutMs: 60000,
      limit: undefined,
      statePath: "",
    }
  );
});

test("parseCliArguments accepts a prompt after --", () => {
  const options = parseCliArguments(["ask", "--", "請", "回答", "OK"]);
  assert.equal(options.prompt, "請 回答 OK");
});

test("parseCliArguments accepts top-level help", () => {
  assert.equal(parseCliArguments(["--help"]).command, "help");
});

test("parseCliArguments accepts a custom session store path", () => {
  const options = parseCliArguments(["list", "--state-path", "/tmp/sessions.json"]);
  assert.equal(options.statePath, "/tmp/sessions.json");
});

test("parseCliArguments rejects invalid numeric options", () => {
  assert.throws(
    () => parseCliArguments(["poll", "--query", "test", "--timeout-ms", "0"]),
    { code: "USAGE" }
  );
});
