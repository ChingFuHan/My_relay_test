const DEFAULT_HOST_BRIDGE_TIMEOUT_MS = 30_000;

export function normalizeHostBridgeConfig(input = {}) {
  const provider =
    input.provider ??
    process.env.GPT_RELAY_BROWSER_PROVIDER ??
    "codex-extension";
  const url =
    input.url ??
    process.env.GPT_RELAY_HOST_BRIDGE_URL ??
    "";
  const token =
    input.token ??
    process.env.GPT_RELAY_HOST_BRIDGE_TOKEN ??
    "";
  const timeoutMs = Number(
    input.timeoutMs ??
      process.env.GPT_RELAY_HOST_BRIDGE_TIMEOUT_MS ??
      DEFAULT_HOST_BRIDGE_TIMEOUT_MS
  );

  return {
    provider,
    url: String(url || "").replace(/\/+$/, ""),
    token: token ? String(token) : "",
    timeoutMs:
      Number.isFinite(timeoutMs) && timeoutMs > 0
        ? timeoutMs
        : DEFAULT_HOST_BRIDGE_TIMEOUT_MS,
  };
}

export function shouldUseHostBridge(config = {}) {
  return normalizeHostBridgeConfig(config).provider === "host-bridge";
}

export async function resolveHostBridgeBrowser(input = {}) {
  const config = normalizeHostBridgeConfig(input);

  if (!config.url) {
    const error = new Error(
      "Host bridge provider requires GPT_RELAY_HOST_BRIDGE_URL or browser.url."
    );
    error.code = "HOST_BRIDGE_URL_MISSING";
    throw error;
  }

  const client = createHostBridgeClient(config);
  await client.healthcheck();
  return createRemoteBrowser(client);
}

function createHostBridgeClient(config) {
  async function request(method, pathname, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const response = await fetch(`${config.url}${pathname}`, {
        method,
        headers: {
          "content-type": "application/json",
          ...(config.token ? { authorization: `Bearer ${config.token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(encodeSpecial(body)),
        signal: controller.signal,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(
          payload?.error?.message ||
            `Host bridge request failed: ${response.status}`
        );
        error.code = payload?.error?.code || "HOST_BRIDGE_REQUEST_FAILED";
        error.status = response.status;
        error.details = payload?.error?.details;
        throw error;
      }

      return payload;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async healthcheck() {
      return await request("GET", "/health");
    },
    async documentation() {
      const payload = await request("GET", "/documentation");
      return payload.documentation;
    },
    async newTab() {
      const payload = await request("POST", "/tabs/new");
      return payload.tab;
    },
    async finalizeTab(tabId, options = {}) {
      return await request("POST", "/tabs/finalize", { tabId, ...options });
    },
    async openTabs() {
      const payload = await request("GET", "/tabs");
      return payload.tabs ?? [];
    },
    async claimTab(candidate) {
      const payload = await request("POST", "/tabs/claim", { candidate });
      return payload.tab;
    },
    async tabMeta(tabId) {
      const payload = await request("GET", `/tabs/${encodeURIComponent(tabId)}`);
      return payload.tab;
    },
    async tabGoto(tabId, url) {
      const payload = await request(
        "POST",
        `/tabs/${encodeURIComponent(tabId)}/goto`,
        { url }
      );
      return payload.tab;
    },
    async execute(tabId, namespace, chain) {
      const payload = await request(
        "POST",
        `/tabs/${encodeURIComponent(tabId)}/rpc`,
        { namespace, chain }
      );
      return payload.result;
    },
  };
}

function createRemoteBrowser(client) {
  return {
    async documentation() {
      return await client.documentation();
    },
    tabs: {
      async new() {
        const tab = await client.newTab();
        return createRemoteTab(client, tab.tabId);
      },
      async finalize(options = {}) {
        return await client.finalizeTab(options.tabId ?? null, options);
      },
    },
    user: {
      async openTabs() {
        return await client.openTabs();
      },
      async claimTab(candidate) {
        const tab = await client.claimTab(candidate);
        return createRemoteTab(client, tab.tabId);
      },
    },
  };
}

function createRemoteTab(client, tabId) {
  return {
    __hostBridgeTabId: tabId,
    async goto(url) {
      await client.tabGoto(tabId, url);
    },
    async url() {
      const meta = await client.tabMeta(tabId);
      return meta.url;
    },
    async title() {
      const meta = await client.tabMeta(tabId);
      return meta.title;
    },
    get playwright() {
      return createRemotePlaywright(client, tabId);
    },
    get cua() {
      return createRemoteChain(client, tabId, "cua");
    },
    get dom_cua() {
      return createRemoteChain(client, tabId, "dom_cua");
    },
    get clipboard() {
      return createRemoteChain(client, tabId, "clipboard");
    },
    get capabilities() {
      return createRemoteChain(client, tabId, "capabilities");
    },
  };
}

function createRemotePlaywright(client, tabId) {
  return {
    waitForLoadState: async (options) =>
      await client.execute(tabId, "playwright", [
        { type: "get", prop: "waitForLoadState" },
        { type: "call", args: [options] },
      ]),
    waitForTimeout: async (timeoutMs) =>
      await client.execute(tabId, "playwright", [
        { type: "get", prop: "waitForTimeout" },
        { type: "call", args: [timeoutMs] },
      ]),
    evaluate: async (pageFunction, arg, options) =>
      await client.execute(tabId, "playwright", [
        { type: "get", prop: "evaluate" },
        { type: "call", args: [pageFunction, arg, options] },
      ]),
    screenshot: async (options) =>
      await client.execute(tabId, "playwright", [
        { type: "get", prop: "screenshot" },
        { type: "call", args: [options] },
      ]),
    waitForEvent: async (eventName, options) =>
      await client.execute(tabId, "playwright", [
        { type: "get", prop: "waitForEvent" },
        { type: "call", args: [eventName, options] },
      ]),
    getByRole: (role, options) =>
      createRemoteLocator(client, tabId, [
        { type: "get", prop: "getByRole" },
        { type: "call", args: [role, options] },
      ]),
    getByText: (text, options) =>
      createRemoteLocator(client, tabId, [
        { type: "get", prop: "getByText" },
        { type: "call", args: [text, options] },
      ]),
    locator: (selector) =>
      createRemoteLocator(client, tabId, [
        { type: "get", prop: "locator" },
        { type: "call", args: [selector] },
      ]),
    keyboard: {
      press: async (key) =>
        await client.execute(tabId, "playwright", [
          { type: "get", prop: "keyboard" },
          { type: "get", prop: "press" },
          { type: "call", args: [key] },
        ]),
    },
  };
}

function createRemoteLocator(client, tabId, chain) {
  return {
    count: async () =>
      await client.execute(tabId, "playwright", [
        ...chain,
        { type: "get", prop: "count" },
        { type: "call", args: [] },
      ]),
    click: async (options = {}) =>
      await client.execute(tabId, "playwright", [
        ...chain,
        { type: "get", prop: "click" },
        { type: "call", args: [options] },
      ]),
    fill: async (value, options = {}) =>
      await client.execute(tabId, "playwright", [
        ...chain,
        { type: "get", prop: "fill" },
        { type: "call", args: [value, options] },
      ]),
    type: async (value, options = {}) =>
      await client.execute(tabId, "playwright", [
        ...chain,
        { type: "get", prop: "type" },
        { type: "call", args: [value, options] },
      ]),
    press: async (value, options = {}) =>
      await client.execute(tabId, "playwright", [
        ...chain,
        { type: "get", prop: "press" },
        { type: "call", args: [value, options] },
      ]),
    innerText: async (options = {}) =>
      await client.execute(tabId, "playwright", [
        ...chain,
        { type: "get", prop: "innerText" },
        { type: "call", args: [options] },
      ]),
    textContent: async (options = {}) =>
      await client.execute(tabId, "playwright", [
        ...chain,
        { type: "get", prop: "textContent" },
        { type: "call", args: [options] },
      ]),
    isVisible: async (options = {}) =>
      await client.execute(tabId, "playwright", [
        ...chain,
        { type: "get", prop: "isVisible" },
        { type: "call", args: [options] },
      ]),
    evaluate: async (pageFunction, arg) =>
      await client.execute(tabId, "playwright", [
        ...chain,
        { type: "get", prop: "evaluate" },
        { type: "call", args: [pageFunction, arg] },
      ]),
    nth: (index) =>
      createRemoteLocator(client, tabId, [
        ...chain,
        { type: "get", prop: "nth" },
        { type: "call", args: [index] },
      ]),
    first: () =>
      createRemoteLocator(client, tabId, [
        ...chain,
        { type: "get", prop: "first" },
        { type: "call", args: [] },
      ]),
    filter: (options = {}) =>
      createRemoteLocator(client, tabId, [
        ...chain,
        { type: "get", prop: "filter" },
        { type: "call", args: [options] },
      ]),
  };
}

function createRemoteChain(client, tabId, namespace, chain = []) {
  const callable = () => {};
  return new Proxy(callable, {
    get(_target, prop) {
      if (prop === Symbol.toPrimitive) {
        return undefined;
      }

      if (prop === "then") {
        return (resolve, reject) => {
          client.execute(tabId, namespace, chain).then(resolve, reject);
        };
      }

      if (prop === "catch") {
        return (reject) => client.execute(tabId, namespace, chain).catch(reject);
      }

      if (prop === "finally") {
        return (callback) => client.execute(tabId, namespace, chain).finally(callback);
      }

      if (prop === "toString") {
        return () => `[HostBridgeRemoteChain ${namespace}]`;
      }

      if (prop === "valueOf") {
        return () => callable;
      }

      if (prop === Symbol.toStringTag) {
        return "HostBridgeRemoteChain";
      }

      return createRemoteChain(client, tabId, namespace, [
        ...chain,
        { type: "get", prop: String(prop) },
      ]);
    },
    apply(_target, _thisArg, args) {
      return createRemoteChain(client, tabId, namespace, [
        ...chain,
        { type: "call", args },
      ]);
    },
  });
}

function encodeSpecial(value) {
  if (value instanceof RegExp) {
    return {
      __hostBridgeType: "RegExp",
      source: value.source,
      flags: value.flags,
    };
  }

  if (typeof value === "function") {
    let source = "";
    try {
      source = String(value);
    } catch {
      source = "";
    }

    return {
      __hostBridgeType: "Function",
      source,
    };
  }

  if (Array.isArray(value)) {
    return value.map(encodeSpecial);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, encodeSpecial(nested)])
    );
  }

  return value;
}

export const __hostBridgeTesting = {
  encodeSpecial,
};
