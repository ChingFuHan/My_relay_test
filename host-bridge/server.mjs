import http from "node:http";
import { chromium } from "playwright";

const PORT = Number(process.env.HOST_BRIDGE_PORT || 8765);
const HOST = process.env.HOST_BRIDGE_HOST || "127.0.0.1";
const TOKEN = process.env.HOST_BRIDGE_TOKEN || "";
const CHROME_CDP_URL = process.env.CHROME_CDP_URL || "http://127.0.0.1:9222";

let browserPromise = null;
const tabs = new Map();
let nextTabId = 1;

const server = http.createServer(async (req, res) => {
  try {
    authorize(req);
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/health") {
      const browser = await getBrowser();
      return writeJson(res, 200, { ok: browser.isConnected(), cdpUrl: CHROME_CDP_URL });
    }

    if (req.method === "GET" && url.pathname === "/documentation") {
      return writeJson(res, 200, {
        documentation:
          "Host bridge for GPT Relay. Uses Playwright connectOverCDP to drive local Chrome.",
      });
    }

    if (req.method === "GET" && url.pathname === "/tabs") {
      return writeJson(res, 200, { tabs: await listTabs() });
    }

    if (req.method === "POST" && url.pathname === "/tabs/new") {
      const page = await newPage();
      const tab = await rememberPage(page);
      return writeJson(res, 200, { tab });
    }

    if (req.method === "POST" && url.pathname === "/tabs/claim") {
      const body = await readJson(req);
      const tab = await claimTab(body?.candidate);
      return writeJson(res, 200, { tab });
    }

    if (req.method === "POST" && url.pathname === "/tabs/finalize") {
      const body = await readJson(req);
      if (body?.tabId && tabs.has(body.tabId) && body.closeTab !== false) {
        const page = tabs.get(body.tabId);
        tabs.delete(body.tabId);
        await page.close().catch(() => {});
      }
      return writeJson(res, 200, { ok: true });
    }

    const gotoMatch = url.pathname.match(/^\/tabs\/([^/]+)\/goto$/);
    if (req.method === "POST" && gotoMatch) {
      const tabId = decodeURIComponent(gotoMatch[1]);
      const body = await readJson(req);
      const page = getPage(tabId);
      await page.goto(body.url);
      return writeJson(res, 200, { tab: await serializePage(tabId, page) });
    }

    const rpcMatch = url.pathname.match(/^\/tabs\/([^/]+)\/rpc$/);
    if (req.method === "POST" && rpcMatch) {
      const tabId = decodeURIComponent(rpcMatch[1]);
      const body = await readJson(req);
      const page = getPage(tabId);
      const result = await executeChain(page, body.namespace, body.chain ?? []);
      return writeJson(res, 200, { result: serializeResult(result) });
    }

    const tabMatch = url.pathname.match(/^\/tabs\/([^/]+)$/);
    if (req.method === "GET" && tabMatch) {
      const tabId = decodeURIComponent(tabMatch[1]);
      const page = getPage(tabId);
      return writeJson(res, 200, { tab: await serializePage(tabId, page) });
    }

    writeJson(res, 404, {
      error: { code: "NOT_FOUND", message: `Unknown route ${req.method} ${url.pathname}` },
    });
  } catch (error) {
    writeJson(res, error.statusCode || 500, {
      error: {
        code: error.code || "HOST_BRIDGE_ERROR",
        message: error.message || "Host bridge request failed.",
      },
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`gpt-relay host bridge listening on http://${HOST}:${PORT}`);
});

function authorize(req) {
  if (!TOKEN) {
    return;
  }

  if (req.headers.authorization !== `Bearer ${TOKEN}`) {
    const error = new Error("Unauthorized");
    error.code = "UNAUTHORIZED";
    error.statusCode = 401;
    throw error;
  }
}

async function getBrowser() {
  if (browserPromise) {
    try {
      const cached = await browserPromise;
      if (cached.isConnected()) return cached;
    } catch {
      // fall through and reconnect
    }
    browserPromise = null;
    tabs.clear();
  }
  browserPromise = (async () => {
    const browser = await chromium.connectOverCDP(CHROME_CDP_URL);
    browser.on("disconnected", () => {
      browserPromise = null;
      tabs.clear();
    });
    return browser;
  })();
  return await browserPromise;
}

async function listTabs() {
  const browser = await getBrowser();
  const pages = browser.contexts().flatMap((context) => context.pages());
  const out = [];
  for (const page of pages) {
    out.push(await rememberPage(page));
  }
  return out;
}

async function newPage() {
  const browser = await getBrowser();
  const context = browser.contexts()[0];
  if (!context) {
    const error = new Error(
      "No Chrome browser context available. Is debug Chrome running on " +
        CHROME_CDP_URL +
        "?"
    );
    error.code = "NO_BROWSER_CONTEXT";
    error.statusCode = 502;
    throw error;
  }
  return await context.newPage();
}

async function rememberPage(page) {
  for (const [tabId, knownPage] of tabs.entries()) {
    if (knownPage === page) {
      return await serializePage(tabId, page);
    }
  }

  const tabId = `tab-${nextTabId++}`;
  tabs.set(tabId, page);
  return await serializePage(tabId, page);
}

async function claimTab(candidate = {}) {
  const knownTabs = await listTabs();
  const found = knownTabs.find((tab) =>
    candidate?.tabId
      ? tab.tabId === candidate.tabId
      : candidate?.url
        ? tab.url === candidate.url
        : candidate?.title
          ? tab.title === candidate.title
          : false
  );

  if (!found) {
    const error = new Error("No matching tab found.");
    error.code = "TAB_NOT_FOUND";
    error.statusCode = 404;
    throw error;
  }

  return found;
}

function getPage(tabId) {
  const page = tabs.get(tabId);
  if (!page) {
    const error = new Error(`Unknown tab id: ${tabId}`);
    error.code = "TAB_NOT_FOUND";
    error.statusCode = 404;
    throw error;
  }
  return page;
}

async function serializePage(tabId, page) {
  return {
    tabId,
    url: page.url(),
    title: await page.title().catch(() => "ChatGPT"),
  };
}

async function executeChain(page, namespace, chain) {
  let current = namespaceRoot(page, namespace);
  let receiver = null;
  let lastProp = null;

  for (const step of chain) {
    if (step.type === "get") {
      receiver = current;
      current = current[step.prop];
      lastProp = step.prop;
      continue;
    }

    if (step.type === "call") {
      if (typeof current !== "function") {
        const error = new Error(
          `Remote chain target is not callable in namespace ${namespace}.`
        );
        error.code = "RPC_NOT_CALLABLE";
        throw error;
      }
      current = await callRemoteMethod(receiver, lastProp, current, step.args ?? []);
      receiver = null;
      lastProp = null;
      continue;
    }

    const error = new Error(`Unsupported chain step: ${step.type}`);
    error.code = "RPC_INVALID_STEP";
    throw error;
  }

  return current;
}

function namespaceRoot(page, namespace) {
  switch (namespace) {
    case "playwright":
      return createPlaywrightRoot(page);
    case "cua":
      return {
        click: async ({ x, y }) => await page.mouse.click(x, y),
        keypress: async ({ keys }) => {
          await page.keyboard.press(normalizeKeypress(keys));
        },
      };
    case "dom_cua":
      return {
        get_visible_dom: async () => await page.content(),
        click: async () => {
          throw unsupported("dom_cua.click not implemented in host bridge yet.");
        },
      };
    case "clipboard":
      return {
        writeText: async (text) =>
          await page.evaluate(
            async (value) => await navigator.clipboard.writeText(value),
            text
          ),
        write: async () => {
          throw unsupported(
            "clipboard.write image/items not implemented in host bridge yet."
          );
        },
      };
    case "capabilities":
      return {
        get: async () => {
          throw unsupported("capabilities.get not implemented in host bridge yet.");
        },
      };
    default:
      throw unsupported(`Unsupported namespace: ${namespace}`);
  }
}

function createPlaywrightRoot(page) {
  return {
    waitForLoadState: async (options = {}) => {
      if (typeof options === "string") {
        return await page.waitForLoadState(options);
      }

      return await page.waitForLoadState(options.state, {
        timeout: options.timeoutMs,
      });
    },
    waitForTimeout: async (timeoutMs) => await page.waitForTimeout(timeoutMs),
    getByRole: (...args) => page.getByRole(...decodeSpecial(args)),
    getByText: (...args) => page.getByText(...decodeSpecial(args)),
    locator: (...args) => page.locator(...decodeSpecial(args)),
    evaluate: async (pageFunction, arg) =>
      await page.evaluate(reviveFunction(pageFunction), decodeSpecial(arg)),
    screenshot: async (options = {}) =>
      await page.screenshot(remapTimeoutOption(options)),
    waitForEvent: async (eventName, options = {}) =>
      await page.waitForEvent(eventName, remapTimeoutOption(options)),
    keyboard: {
      press: async (key) => await page.keyboard.press(key),
    },
  };
}

function normalizeKeypress(keys = []) {
  return keys.map((key) => (key === "ControlOrMeta" ? "MetaOrControl" : key)).join("+");
}

async function callRemoteMethod(receiver, prop, fn, rawArgs) {
  const args = decodeSpecial(rawArgs);

  if (receiver && prop === "filter") {
    return await receiver.filter(normalizeLocatorFilter(args[0] ?? {}));
  }

  if (receiver && prop === "isVisible") {
    return await receiver.isVisible(remapTimeoutOption(args[0] ?? {}));
  }

  if (receiver && prop === "click") {
    return await receiver.click(remapTimeoutOption(args[0] ?? {}));
  }

  if (receiver && prop === "fill") {
    const [value, options = {}] = args;
    return await receiver.fill(value, remapTimeoutOption(options));
  }

  if (receiver && prop === "type") {
    const [value, options = {}] = args;
    return await receiver.type(value, remapTimeoutOption(options));
  }

  if (receiver && prop === "press") {
    const [value, options = {}] = args;
    return await receiver.press(value, remapTimeoutOption(options));
  }

  if (receiver && prop === "innerText") {
    return await receiver.innerText(remapTimeoutOption(args[0] ?? {}));
  }

  if (receiver && prop === "textContent") {
    return await receiver.textContent(remapTimeoutOption(args[0] ?? {}));
  }

  if (receiver && prop === "count") {
    return await receiver.count();
  }

  if (receiver && prop === "nth") {
    return receiver.nth(...args);
  }

  if (receiver && prop === "first") {
    return receiver.first();
  }

  if (receiver && prop === "evaluate") {
    const [pageFunction, arg] = args;
    return await receiver.evaluate(reviveFunction(pageFunction), decodeSpecial(arg));
  }

  return await fn.apply(receiver, args);
}

function remapTimeoutOption(options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    return options;
  }

  const next = { ...options };
  if ("timeoutMs" in next && !("timeout" in next)) {
    next.timeout = next.timeoutMs;
    delete next.timeoutMs;
  }
  return next;
}

function normalizeLocatorFilter(options = {}) {
  const next = remapTimeoutOption(options);
  if (next.hasText instanceof RegExp || typeof next.hasText === "string") {
    return next;
  }
  return decodeSpecial(next);
}

function decodeSpecial(value) {
  if (Array.isArray(value)) {
    return value.map(decodeSpecial);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (value.__hostBridgeType === "RegExp") {
    return new RegExp(value.source, value.flags);
  }

  if (value.__hostBridgeType === "Function") {
    return reviveFunction(value);
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, decodeSpecial(nested)])
  );
}

function reviveFunction(value) {
  if (typeof value === "function") {
    return value;
  }

  if (!value || typeof value !== "object" || value.__hostBridgeType !== "Function") {
    return value;
  }

  return Function(`return (${value.source})`)();
}

function serializeResult(value) {
  if (value === undefined || value === null) {
    return value;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(serializeResult);
  }
  if (typeof value === "object") {
    return value;
  }
  return String(value);
}

function unsupported(message) {
  const error = new Error(message);
  error.code = "HOST_BRIDGE_UNSUPPORTED";
  return error;
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (!chunks.length) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}
