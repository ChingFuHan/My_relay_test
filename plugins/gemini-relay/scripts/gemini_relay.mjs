import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  normalizeHostBridgeConfig,
  resolveHostBridgeBrowser,
  shouldUseHostBridge,
} from "./adapters/host_bridge_adapter.mjs";

const GEMINI_URL = "https://gemini.google.com/app";
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_POLL_TIMEOUT_MS = 2 * 60 * 1000;
const POLL_INTERVAL_MS = 2000;
const RESPONSE_STABLE_MS = 5000;

export async function runGeminiRelay(options = {}) {
  const {
    browser: requestedBrowser,
    prompt,
    keepTab = true,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    conversationUrl: requestedConversationUrl,
    sessionId,
    statePath,
  } = options;

  if (typeof prompt !== "string" || !prompt.trim()) {
    throw codedError("PROMPT_MISSING", "A non-empty prompt is required.");
  }

  const browser = await resolveBrowser(requestedBrowser);
  let tab;

  try {
    const continuing = Boolean(
      requestedConversationUrl && getConversationId(requestedConversationUrl)
    );
    if (continuing) {
      ({ tab } = await openOrClaimStoredSessionTab(browser, {
        conversationUrl: requestedConversationUrl,
      }));
    } else {
      tab = await browser.tabs.new();
      await tab.goto(GEMINI_URL);
      await waitForLoad(tab);
    }

    const accessState = classifyGeminiAccessStateSnapshot(
      await readGeminiAccessState(tab)
    );
    throwForBlockedGeminiAccessState(accessState);

    const composer = await ensureComposer(tab);
    await fillComposer(composer, prompt.trim());
    await clickSend(tab, composer);

    const result = await waitForAssistantResponse(tab, timeoutMs);
    const guestMode = accessState.state === "guest";
    const currentUrl = await waitForGeminiConversationUrl(tab);
    const sessionConversationUrl =
      guestMode && !getConversationId(currentUrl) ? "" : currentUrl;
    const title = await safeTabTitle(tab);

    const record = await upsertSessionRecord({
      relaySessionId: sessionId,
      conversationUrl: sessionConversationUrl,
      title,
      status: "complete",
      guestMode,
      messages: [
        { role: "user", text: prompt.trim() },
        { role: "assistant", text: result.assistantText },
      ],
      statePath,
    });

    return {
      ok: true,
      status: "complete",
      guestMode,
      accessState: accessState.state,
      assistantText: result.assistantText,
      finalResponseText: result.assistantText,
      finalDeliveryText: result.assistantText,
      mustReturnFinalDelivery: true,
      finalDeliveryField: "finalDeliveryText",
      mustReturnVerbatim: true,
      verbatimField: "finalDeliveryText",
      finalOutputContract: {
        kind: "complete-relay-delivery",
        appliesWhen: 'status is "complete" and finalDeliveryText is non-empty',
        instruction:
          "Return finalDeliveryText exactly as the final user-facing answer. Do not summarize, rewrite, omit, add a preface, or wrap it in another format.",
      },
      conversationUrl: sessionConversationUrl,
      session: publicSession(record),
      title,
    };
  } finally {
    await finalizeRelayTab(browser, tab, keepTab);
  }
}

export async function continueGeminiRelay(options = {}) {
  const { sessionId, query, statePath } = options;
  const session = await findStoredSession({ sessionId, query, statePath });
  if (!session) {
    throw codedError(
      "SESSION_NOT_FOUND",
      "No stored Gemini session matched the given query or session id."
    );
  }
  if (session.guestMode || !getConversationId(session.conversationUrl)) {
    throw codedError(
      "GUEST_SESSION_NOT_CONTINUABLE",
      "This Gemini session has no resumable conversation URL (guest mode); start a new ask instead."
    );
  }

  return await runGeminiRelay({
    browser: options.browser,
    prompt: options.prompt,
    conversationUrl: session.conversationUrl,
    sessionId: session.relaySessionId,
    statePath,
    timeoutMs: options.timeoutMs,
    keepTab: options.keepTab ?? true,
  });
}

export async function pollGeminiRelay(options = {}) {
  const {
    browser: requestedBrowser,
    sessionId,
    query,
    statePath,
    keepTab = true,
    timeoutMs = DEFAULT_POLL_TIMEOUT_MS,
  } = options;

  const session = await findStoredSession({ sessionId, query, statePath });
  if (!session) {
    throw codedError(
      "SESSION_NOT_FOUND",
      "No stored Gemini session matched the given query or session id."
    );
  }
  if (!getConversationId(session.conversationUrl)) {
    throw codedError(
      "GUEST_SESSION_NOT_POLLABLE",
      "This Gemini session has no resumable conversation URL to poll."
    );
  }

  const browser = await resolveBrowser(requestedBrowser);
  let tab;
  try {
    ({ tab } = await openOrClaimStoredSessionTab(browser, session));
    const result = await waitForAssistantResponse(tab, timeoutMs);
    const conversationUrl = await safeTabUrl(tab);
    const title = await safeTabTitle(tab);

    const record = await upsertSessionRecord({
      relaySessionId: session.relaySessionId,
      conversationUrl: getConversationId(conversationUrl)
        ? conversationUrl
        : session.conversationUrl,
      title,
      status: "complete",
      guestMode: session.guestMode,
      statePath,
    });

    return {
      ok: true,
      status: "complete",
      guestMode: Boolean(session.guestMode),
      assistantText: result.assistantText,
      finalResponseText: result.assistantText,
      finalDeliveryText: result.assistantText,
      conversationUrl: record.conversationUrl,
      session: publicSession(record),
      title,
    };
  } finally {
    await finalizeRelayTab(browser, tab, keepTab);
  }
}

export async function listGeminiSessions(options = {}) {
  const { query = "", limit = 20, statePath } = options;
  const store = await loadSessionStore(statePath);
  return filterSessions(store.sessions, query)
    .slice(0, limit)
    .map((session) => publicSession(session));
}

async function resolveBrowser(requestedBrowser) {
  if (
    requestedBrowser?.documentation &&
    typeof requestedBrowser.documentation === "function"
  ) {
    return requestedBrowser;
  }

  if (shouldUseHostBridge(requestedBrowser ?? {})) {
    return await resolveHostBridgeBrowser(requestedBrowser ?? {});
  }

  if (globalThis.browser) {
    try {
      await globalThis.browser.documentation();
      return globalThis.browser;
    } catch (error) {
      if (!isNativePipeClosedError(error)) {
        throw error;
      }
      delete globalThis.browser;
    }
  }

  const browserClientPath = await findBrowserClientModule();
  const browserClient = await import(pathToFileURL(browserClientPath).href);
  await browserClient.setupBrowserRuntime({ globals: globalThis });

  if (!globalThis.agent?.browsers?.get) {
    throw codedError(
      "CHROME_BROWSER_MISSING",
      "Chrome browser runtime did not expose a browser connector."
    );
  }

  const connectedBrowser = await globalThis.agent.browsers.get("extension");
  globalThis.browser = connectedBrowser;
  await connectedBrowser.documentation();
  return connectedBrowser;
}

function resolveBrowserProviderConfig(requestedBrowser) {
  if (
    requestedBrowser?.documentation &&
    typeof requestedBrowser.documentation === "function"
  ) {
    return { provider: "direct-object" };
  }

  if (shouldUseHostBridge(requestedBrowser ?? {})) {
    return normalizeHostBridgeConfig(requestedBrowser ?? {});
  }

  return { provider: "codex-extension" };
}

async function findBrowserClientModule() {
  const homeDir = globalThis.nodeRepl?.homeDir;

  if (!homeDir) {
    throw codedError(
      "CHROME_BROWSER_CLIENT_MISSING",
      "The Node runtime did not expose a home directory for locating the Chrome plugin."
    );
  }

  const chromeRoot = path.join(
    homeDir,
    ".codex",
    "plugins",
    "cache",
    "openai-bundled",
    "chrome"
  );

  let versionDirs;
  try {
    versionDirs = await readdir(chromeRoot);
  } catch (error) {
    throw codedError(
      "CHROME_BROWSER_CLIENT_MISSING",
      "Could not find the bundled Chrome plugin cache.",
      { cause: error }
    );
  }

  for (const versionDir of versionDirs.sort().reverse()) {
    const candidate = path.join(chromeRoot, versionDir, "scripts", "browser-client.mjs");
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try next installed version.
    }
  }

  throw codedError(
    "CHROME_BROWSER_CLIENT_MISSING",
    "Could not find Chrome plugin scripts/browser-client.mjs."
  );
}

async function waitForLoad(tab) {
  await tab.playwright.waitForLoadState({
    state: "domcontentloaded",
    timeoutMs: 30000,
  });
}

async function ensureComposer(tab) {
  const deadline = Date.now() + 30000;
  let lastError = null;

  while (Date.now() < deadline) {
    const candidates = [
      tab.playwright.getByRole("textbox", { name: /gemini|ask|prompt|對 Gemini|提問/i }),
      tab.playwright.locator("textarea"),
      tab.playwright.locator("[contenteditable='true'][role='textbox']"),
      tab.playwright.locator("[contenteditable='true']"),
    ];

    for (const composer of candidates) {
      try {
        const visible = await firstVisibleLocator(composer);
        if (visible) {
          return visible;
        }
      } catch (error) {
        lastError = error;
      }
    }

    await tab.playwright.waitForTimeout(500);
  }

  const accessState = classifyGeminiAccessStateSnapshot(await readGeminiAccessState(tab));
  throwForBlockedGeminiAccessState(accessState);

  throw codedError(
    "GEMINI_COMPOSER_MISSING",
    "Could not find the Gemini composer textbox.",
    { cause: lastError }
  );
}

async function fillComposer(composer, prompt) {
  await composer.click({});
  if (typeof composer.fill === "function") {
    await composer.fill(prompt);
    return;
  }
  if (typeof composer.pressSequentially === "function") {
    await composer.pressSequentially(prompt);
    return;
  }
  throw codedError("GEMINI_COMPOSER_UNUSABLE", "Could not type into the Gemini composer.");
}

async function clickSend(tab, composer) {
  const candidates = [
    tab.playwright.getByRole("button", { name: /send|submit|送出|傳送/i }),
    tab.playwright.locator("button[aria-label*='Send']"),
    tab.playwright.locator("button[aria-label*='send']"),
    tab.playwright.locator("button[type='submit']"),
  ];

  for (const candidate of candidates) {
    const visible = await firstVisibleLocator(candidate);
    if (!visible) {
      continue;
    }
    try {
      if (typeof visible.isEnabled === "function") {
        const enabled = await visible.isEnabled().catch(() => true);
        if (!enabled) {
          continue;
        }
      }
      await visible.click({});
      return;
    } catch {
      // Try next candidate.
    }
  }

  if (typeof composer.press === "function") {
    await composer.press("ControlOrMeta+Enter").catch(() => {});
    await tab.playwright.waitForTimeout(500);
    return;
  }

  throw codedError(
    "GEMINI_SEND_BUTTON_MISSING",
    "Could not find the Gemini send button after filling the prompt."
  );
}

async function waitForAssistantResponse(tab, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let stableSince = 0;
  let lastText = "";
  let bestText = "";

  while (Date.now() < deadline) {
    const state = await readAssistantState(tab);
    const assistantText = String(state.assistantText ?? "").trim();

    if (assistantText) {
      if (assistantText === lastText) {
        stableSince ||= Date.now();
      } else {
        stableSince = 0;
        lastText = assistantText;
        bestText = assistantText;
      }
    }

    if (bestText && !state.generating) {
      if (!stableSince) {
        stableSince = Date.now();
      }
      if (Date.now() - stableSince >= RESPONSE_STABLE_MS) {
        return { assistantText: bestText };
      }
    }

    await tab.playwright.waitForTimeout(POLL_INTERVAL_MS);
  }

  throw codedError(
    "GEMINI_RESPONSE_TIMEOUT",
    "Gemini did not finish answering before the timeout."
  );
}

async function readAssistantState(tab) {
  return await tab.playwright.evaluate(() => {
    const normalize = (value) =>
      String(value ?? "")
        .replace(/\s+/g, " ")
        .trim();
    const isVisible = (element) => {
      if (!element) {
        return false;
      }
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") {
        return false;
      }
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const selectors = [
      "[data-response-id]",
      "[data-turn-role='model']",
      "[data-message-author-role='model']",
      "[data-message-author-role='assistant']",
      "message-content",
      ".model-response-text",
      ".response-content",
      "main .markdown",
      "main .prose",
      "article",
    ];

    const texts = [];
    for (const selector of selectors) {
      for (const element of document.querySelectorAll(selector)) {
        if (!isVisible(element)) {
          continue;
        }
        const text = normalize(element.innerText || element.textContent || "");
        if (text) {
          texts.push(text);
        }
      }
    }

    const deduped = texts.filter((text, index) => texts.indexOf(text) === index);
    const assistantText = deduped[deduped.length - 1] || "";
    const bodyText = normalize(document.body?.innerText || document.body?.textContent || "");
    const generating =
      /responding|generating|thinking|working|撰寫中|思考中|生成中/i.test(bodyText) ||
      Array.from(document.querySelectorAll("button,[role='button']")).some((element) =>
        /stop|停止/i.test(normalize(element.getAttribute("aria-label") || element.innerText))
      );

    return {
      assistantText,
      generating,
    };
  }, undefined, { timeoutMs: 5000 });
}

async function readCompactPageState(tab) {
  return await tab.playwright.evaluate(() => {
    const text = (document.body?.innerText || document.body?.textContent || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 2000);

    return {
      title: document.title,
      url: location.href,
      text,
    };
  }, undefined, { timeoutMs: 5000 });
}

async function readGeminiAccessState(tab) {
  const pageState = await readCompactPageState(tab);

  return await tab.playwright.evaluate((snapshot) => {
    const normalize = (value) =>
      String(value ?? "")
        .trim()
        .replace(/\s+/g, " ");

    const bodyText = normalize(document.body?.innerText || document.body?.textContent || "");
    const combined = normalize(`${snapshot.title} ${snapshot.text} ${bodyText}`).slice(0, 4000);

    const hasComposer = Boolean(
      document.querySelector("textarea, [contenteditable='true'][role='textbox'], [contenteditable='true']")
    );
    const hasProfileButton = Boolean(
      document.querySelector("[aria-label*='Google Account'], [aria-label*='Google 帳戶'], img[alt*='Google Account']")
    );
    const hasAccountMenuLikeButton = Array.from(document.querySelectorAll("button,[role='button'],a")).some(
      (element) =>
        /google account|google 帳戶|profile|account|avatar|個人資料|帳戶/i.test(
          normalize(
            element.getAttribute("aria-label") ||
              element.getAttribute("title") ||
              element.innerText ||
              element.textContent
          )
        )
    );
    const hasLoginControls = Array.from(document.querySelectorAll("button,a,[role='button']")).some(
      (element) =>
        /sign in|log in|continue with google|登入|登錄/i.test(
          normalize(
            element.getAttribute("aria-label") ||
              element.getAttribute("title") ||
              element.innerText ||
              element.textContent
          )
        )
    );

    return {
      combined,
      hasComposer,
      hasProfileButton,
      hasAccountMenuLikeButton,
      hasLoginControls,
    };
  }, pageState, { timeoutMs: 5000 });
}

function classifyGeminiAccessStateSnapshot(snapshot = {}) {
  const combined = String(snapshot.combined ?? "");
  const hasComposer = Boolean(snapshot.hasComposer);
  const hasProfileButton = Boolean(snapshot.hasProfileButton);
  const hasAccountMenuLikeButton = Boolean(snapshot.hasAccountMenuLikeButton);
  const hasLoginControls = Boolean(snapshot.hasLoginControls);

  const verificationRequired = /captcha|verify|verification|驗證|確認你是人類|human/i.test(combined);
  if (verificationRequired) {
    return {
      state: "verification-required",
      message: "Gemini is showing a verification or CAPTCHA step.",
    };
  }

  const loginLike = /sign in|log in|continue with google|登入|登錄|使用 google 帳戶/i.test(combined);
  const guestLike = /without signing in|signed out|guest|未登入|訪客/i.test(combined);

  if (hasComposer && (hasProfileButton || hasAccountMenuLikeButton)) {
    return {
      state: "logged-in",
      message: "Gemini appears signed in and ready.",
    };
  }

  if (hasComposer) {
    return {
      state: "guest",
      message:
        hasLoginControls || loginLike || guestLike
          ? "Gemini appears to allow an interactive signed-out prompt."
          : "Gemini exposes a composer without account controls; treating it as guest mode.",
    };
  }

  if (hasLoginControls || loginLike || guestLike) {
    return {
      state: "guest-or-logged-out",
      message: "Gemini is waiting at a signed-out or sign-in page.",
    };
  }

  return {
    state: "unknown",
    message: "Could not confidently determine whether Gemini is usable.",
  };
}

function throwForBlockedGeminiAccessState(accessState) {
  if (accessState.state === "verification-required") {
    throw codedError(
      "GEMINI_VERIFICATION_REQUIRED",
      accessState.message || "Gemini is showing a verification or CAPTCHA step."
    );
  }
  if (accessState.state === "guest-or-logged-out") {
    throw codedError(
      "GEMINI_LOGIN_REQUIRED",
      accessState.message || "Gemini is not showing an interactive signed-out composer."
    );
  }
  if (accessState.state === "unknown") {
    throw codedError(
      "GEMINI_ACCESS_STATE_UNKNOWN",
      accessState.message || "Could not determine whether Gemini is usable."
    );
  }
}

async function firstVisibleLocator(locator) {
  const count = Math.min(await safeLocatorCount(locator), 10);

  for (let index = 0; index < count; index += 1) {
    const candidate = typeof locator.nth === "function" ? locator.nth(index) : locator.first();
    if (typeof candidate.isVisible !== "function") {
      return candidate;
    }

    if (await candidate.isVisible().catch(() => false)) {
      return candidate;
    }
  }

  return null;
}

async function safeLocatorCount(locator) {
  if (!locator || typeof locator.count !== "function") {
    return 0;
  }
  return locator.count().catch(() => 0);
}

async function safeTabTitle(tab) {
  try {
    return await tab.title();
  } catch {
    return "Gemini";
  }
}

async function finalizeRelayTab(browser, tab, keepTab) {
  if (!browser?.tabs?.finalize) {
    return;
  }

  try {
    if (keepTab && tab) {
      await browser.tabs.finalize({
        keep: [{ tab, status: "handoff" }],
      });
      return;
    }

    await browser.tabs.finalize({});
  } catch (error) {
    if (isNativePipeClosedError(error)) {
      return;
    }
    throw error;
  }
}

async function openOrClaimStoredSessionTab(browser, session) {
  const conversationId = getConversationId(session.conversationUrl);
  const openTabs = (await browser.user?.openTabs?.().catch(() => [])) ?? [];
  const candidate = openTabs.find((openTab) => {
    const url = String(openTab.url ?? "");
    const title = String(openTab.title ?? "");
    return (
      (conversationId && url.includes(`/app/${conversationId}`)) ||
      (session.conversationUrl && url === session.conversationUrl) ||
      (session.title && title.includes(session.title))
    );
  });

  if (candidate && typeof browser.user?.claimTab === "function") {
    const tab = await browser.user.claimTab(candidate);
    await waitForLoad(tab).catch(() => undefined);
    return { tab, source: "claimed-user-tab" };
  }

  const tab = await browser.tabs.new();
  await tab.goto(session.conversationUrl);
  await waitForLoad(tab);
  return { tab, source: "new-url-tab" };
}

async function waitForGeminiConversationUrl(tab, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const currentUrl = await safeTabUrl(tab);
    if (getConversationId(currentUrl)) {
      return currentUrl;
    }
    await tab.playwright.waitForTimeout(500);
  }

  return await safeTabUrl(tab);
}

async function safeTabUrl(tab) {
  try {
    if (typeof tab.url === "function") {
      const url = await tab.url();
      if (url) {
        return url;
      }
    }
  } catch {
    // Fall back to reading location.href from the page.
  }
  try {
    const state = await readCompactPageState(tab);
    return state.url || "";
  } catch {
    return "";
  }
}

// --- Session store (independent of gpt-relay; never reuse its globals/paths) ---

async function findStoredSession({ sessionId, query, statePath }) {
  const store = await loadSessionStore(statePath);
  const matches = filterSessions(store.sessions, query);

  if (!sessionId) {
    return matches[0] ?? null;
  }

  const needle = sessionId.toLowerCase();
  return (
    matches.find((session) =>
      [
        session.relaySessionId,
        session.conversationId,
        session.conversationUrl,
        session.title,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(needle))
    ) ?? null
  );
}

function filterSessions(sessions, query = "") {
  const needle = String(query ?? "").trim().toLowerCase();
  const sorted = [...sessions].sort((a, b) =>
    String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""))
  );

  if (!needle) {
    return sorted;
  }

  return sorted.filter((session) =>
    [
      session.title,
      session.summary,
      session.relaySessionId,
      session.conversationId,
      session.conversationUrl,
      ...(session.keywords ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(needle)
  );
}

async function upsertSessionRecord(input) {
  const statePath = getStatePath(input.statePath);
  try {
    return await upsertSessionRecordAtPath(statePath, input);
  } catch (error) {
    if (!isWritePermissionError(error)) {
      throw error;
    }

    const fallbackPath = getFallbackStatePath();
    const fallbackRecord = await upsertSessionRecordAtPath(fallbackPath, input);
    fallbackRecord.stateWarning = `Preferred session store was not writable; using ${fallbackPath}.`;
    fallbackRecord.statePath = fallbackPath;
    globalThis.__geminiRelayStatePath = fallbackPath;
    return fallbackRecord;
  }
}

async function upsertSessionRecordAtPath(statePath, input) {
  const store = await loadSessionStore(statePath);
  const now = new Date().toISOString();
  const conversationId = getConversationId(input.conversationUrl);
  const relaySessionId =
    input.relaySessionId || conversationId || `relay-${Date.now()}`;

  const existingIndex = store.sessions.findIndex(
    (session) =>
      session.relaySessionId === relaySessionId ||
      (conversationId && session.conversationId === conversationId)
  );
  const existing = existingIndex >= 0 ? store.sessions[existingIndex] : {};
  const mergedMessages = input.messages?.length
    ? input.messages
    : existing.messages ?? [];

  const next = {
    ...existing,
    relaySessionId: existing.relaySessionId ?? relaySessionId,
    conversationId: conversationId ?? existing.conversationId,
    conversationUrl: input.conversationUrl ?? existing.conversationUrl,
    title: input.title ?? existing.title ?? "Gemini",
    status: input.status ?? existing.status ?? "complete",
    guestMode: input.guestMode ?? existing.guestMode ?? false,
    messages: mergedMessages,
    summary: summarizeMessages(mergedMessages),
    keywords: extractKeywords(mergedMessages),
    createdAt: existing.createdAt ?? now,
    updatedAt: now,
    statePath,
  };

  if (existingIndex >= 0) {
    store.sessions[existingIndex] = next;
  } else {
    store.sessions.push(next);
  }

  await saveSessionStore(statePath, store);
  return next;
}

async function loadSessionStore(statePath) {
  const resolvedPath = getStatePath(statePath);
  const primary = await readSessionStoreAtPath(resolvedPath);
  if (primary) {
    return primary;
  }

  if (!statePath) {
    const fallbackPath = getFallbackStatePathIfAvailable();
    if (fallbackPath && fallbackPath !== resolvedPath) {
      const fallback = await readSessionStoreAtPath(fallbackPath);
      if (fallback) {
        globalThis.__geminiRelayStatePath = fallbackPath;
        return fallback;
      }
    }
  }

  return {
    version: 1,
    sessions: [],
  };
}

async function readSessionStoreAtPath(resolvedPath) {
  try {
    const raw = await readFile(resolvedPath, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.sessions)) {
      return parsed;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw codedError("SESSION_STORE_READ_FAILED", "Could not read session store.", {
        cause: error,
      });
    }
  }

  return null;
}

async function saveSessionStore(statePath, store) {
  const resolvedPath = getStatePath(statePath);
  await mkdir(path.dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function getStatePath(statePath) {
  if (statePath) {
    return statePath;
  }

  if (globalThis.__geminiRelayStatePath) {
    return globalThis.__geminiRelayStatePath;
  }

  const homeDir = globalThis.nodeRepl?.homeDir;
  if (!homeDir) {
    return getFallbackStatePath();
  }

  return path.join(homeDir, ".codex", "gemini-relay", "sessions.json");
}

function getFallbackStatePath() {
  const tmpDir = globalThis.nodeRepl?.tmpDir;
  if (!tmpDir) {
    throw codedError(
      "SESSION_STORE_PATH_MISSING",
      "No session store path was provided and the Node runtime has no writable temp directory."
    );
  }

  return path.join(tmpDir, "gemini-relay", "sessions.json");
}

function getFallbackStatePathIfAvailable() {
  try {
    return getFallbackStatePath();
  } catch {
    return null;
  }
}

function isWritePermissionError(error) {
  const code = error?.cause?.code ?? error?.code;
  return ["EPERM", "EACCES", "EROFS"].includes(code);
}

function getConversationId(conversationUrl) {
  if (!conversationUrl) {
    return null;
  }

  const match = String(conversationUrl).match(/\/app\/([^/?#]+)/);
  return match?.[1] ?? null;
}

function summarizeMessages(messages = []) {
  const firstUser = messages.find((message) => message.role === "user")?.text ?? "";
  const lastAssistant =
    [...messages].reverse().find((message) => message.role === "assistant")?.text ?? "";

  return trimForSummary([firstUser, lastAssistant].filter(Boolean).join(" -> "));
}

function extractKeywords(messages = []) {
  const text = messages
    .map((message) => message.text)
    .join(" ")
    .replace(/\s+/g, " ");
  const tokens =
    text.match(/[\p{Script=Han}]{2,}|[A-Za-z0-9][A-Za-z0-9_-]{2,}/gu) ?? [];
  return dedupe(tokens.map((token) => token.toLowerCase())).slice(0, 24);
}

function trimForSummary(text) {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  return clean.length > 260 ? `${clean.slice(0, 257)}...` : clean;
}

function dedupe(values) {
  return [...new Set(values.filter(Boolean))];
}

function publicSession(session) {
  return {
    relaySessionId: session.relaySessionId,
    conversationId: session.conversationId,
    conversationUrl: session.conversationUrl,
    title: session.title,
    summary: session.summary,
    keywords: session.keywords,
    status: session.status,
    guestMode: Boolean(session.guestMode),
    statePath: session.statePath,
    stateWarning: session.stateWarning,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

function isNativePipeClosedError(error) {
  return /native pipe is closed/i.test(String(error?.message ?? error ?? ""));
}

function codedError(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

export const __testing = {
  classifyGeminiAccessStateSnapshot,
  resolveBrowserProviderConfig,
  getConversationId,
  filterSessions,
  findStoredSession,
  getStatePath,
  upsertSessionRecord,
  loadSessionStore,
  publicSession,
};
