import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { __testing } from "./gemini_relay.mjs";

test("Gemini access state detects logged-in workspace", () => {
  const state = __testing.classifyGeminiAccessStateSnapshot({
    combined: "Gemini Google Account Workspace",
    hasComposer: true,
    hasProfileButton: true,
    hasAccountMenuLikeButton: true,
    hasLoginControls: false,
  });

  assert.equal(state.state, "logged-in");
});

test("Gemini access state detects interactive guest workspace", () => {
  const state = __testing.classifyGeminiAccessStateSnapshot({
    combined: "Gemini without signing in Sign in to unlock more",
    hasComposer: true,
    hasProfileButton: false,
    hasAccountMenuLikeButton: false,
    hasLoginControls: true,
  });

  assert.equal(state.state, "guest");
});

test("Gemini access state detects blocked signed-out page", () => {
  const state = __testing.classifyGeminiAccessStateSnapshot({
    combined: "Gemini Sign in Continue with Google",
    hasComposer: false,
    hasProfileButton: false,
    hasAccountMenuLikeButton: false,
    hasLoginControls: true,
  });

  assert.equal(state.state, "guest-or-logged-out");
});

test("Gemini access state detects verification step", () => {
  const state = __testing.classifyGeminiAccessStateSnapshot({
    combined: "Gemini verify you are human",
    hasComposer: false,
    hasProfileButton: false,
    hasAccountMenuLikeButton: false,
    hasLoginControls: false,
  });

  assert.equal(state.state, "verification-required");
});

test("resolveBrowserProviderConfig reports host bridge", () => {
  const config = __testing.resolveBrowserProviderConfig({
    provider: "host-bridge",
    hostBridgeUrl: "http://127.0.0.1:8765",
    hostBridgeToken: "secret",
  });

  assert.equal(config.provider, "host-bridge");
});

test("getConversationId parses /app/<id> and rejects bare /app", () => {
  assert.equal(
    __testing.getConversationId("https://gemini.google.com/app/abc123"),
    "abc123"
  );
  assert.equal(__testing.getConversationId("https://gemini.google.com/app"), null);
  assert.equal(__testing.getConversationId(""), null);
  assert.equal(__testing.getConversationId(null), null);
});

test("filterSessions matches title, keyword, and sorts by updatedAt", () => {
  const sessions = [
    {
      relaySessionId: "older",
      title: "Design review",
      keywords: ["design", "review"],
      updatedAt: "2026-06-01T00:00:00.000Z",
    },
    {
      relaySessionId: "newer",
      title: "Test strategy",
      keywords: ["tests"],
      updatedAt: "2026-06-25T00:00:00.000Z",
    },
  ];

  assert.deepEqual(
    __testing.filterSessions(sessions, "").map((s) => s.relaySessionId),
    ["newer", "older"]
  );
  assert.deepEqual(
    __testing.filterSessions(sessions, "design").map((s) => s.relaySessionId),
    ["older"]
  );
  assert.deepEqual(
    __testing.filterSessions(sessions, "tests").map((s) => s.relaySessionId),
    ["newer"]
  );
});

test("upsertSessionRecord persists and findStoredSession retrieves it", async () => {
  const statePath = path.join(
    os.tmpdir(),
    `gemini-relay-test-${process.pid}-${Date.now()}.json`
  );

  try {
    const record = await __testing.upsertSessionRecord({
      statePath,
      conversationUrl: "https://gemini.google.com/app/conv789",
      title: "Repo test strategy",
      status: "complete",
      messages: [
        { role: "user", text: "analyze the repo" },
        { role: "assistant", text: "here is the analysis" },
      ],
    });

    assert.equal(record.conversationId, "conv789");
    assert.equal(record.relaySessionId, "conv789");
    assert.equal(record.status, "complete");
    assert.ok(record.summary.includes("analyze the repo"));

    const store = await __testing.loadSessionStore(statePath);
    assert.equal(store.sessions.length, 1);

    const found = await __testing.findStoredSession({
      query: "conv789",
      statePath,
    });
    assert.equal(found?.relaySessionId, "conv789");

    // A second upsert on the same conversation updates in place.
    await __testing.upsertSessionRecord({
      statePath,
      conversationUrl: "https://gemini.google.com/app/conv789",
      messages: [{ role: "user", text: "follow up" }],
    });
    const store2 = await __testing.loadSessionStore(statePath);
    assert.equal(store2.sessions.length, 1);
  } finally {
    await rm(statePath, { force: true });
  }
});

test("publicSession exposes only safe fields", () => {
  const pub = __testing.publicSession({
    relaySessionId: "abc",
    conversationUrl: "https://gemini.google.com/app/abc",
    title: "T",
    guestMode: 1,
    messages: [{ role: "user", text: "secret" }],
  });

  assert.equal(pub.relaySessionId, "abc");
  assert.equal(pub.guestMode, true);
  assert.equal(pub.messages, undefined);
});
