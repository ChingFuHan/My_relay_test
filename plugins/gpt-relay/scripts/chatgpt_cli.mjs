#!/usr/bin/env node

import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  continueExtendedProRelay,
  listRelaySessions,
  pollRelaySession,
  runExtendedProRelay,
} from "./chatgpt_relay.mjs";

const COMMANDS = new Set(["ask", "continue", "poll", "list", "help"]);

const HELP = `GPT Relay CLI

Usage:
  node chatgpt_cli.mjs ask --prompt "Question for ChatGPT"
  node chatgpt_cli.mjs continue --query "prior topic" --prompt "Continue with..."
  node chatgpt_cli.mjs poll --query "prior topic"
  node chatgpt_cli.mjs list [--query "topic"] [--limit 10]

Commands:
  ask       Start a new ChatGPT relay. The prompt can also be piped through stdin.
  continue  Continue a stored relay session selected by --query.
  poll      Check a stored relay session selected by --query.
  list      List stored relay sessions.

ask options:
  --prompt TEXT
  --feature FEATURE
  --model MODEL --mode MODE --effort EFFORT
  --timeout-ms NUMBER
  --state-path PATH
  --return-pending
  --json

Use -- to pass the remaining command-line text as a prompt.
`;

export function parseCliArguments(argv) {
  const args = [...argv];
  const firstArgument = args.shift();
  const command =
    firstArgument === "--help" || firstArgument === "-h"
      ? "help"
      : firstArgument ?? "help";
  if (!COMMANDS.has(command)) {
    throw usageError(`Unknown command: ${command}`);
  }

  const options = {
    command,
    json: false,
    returnPending: false,
    prompt: "",
    query: "",
    feature: "",
    model: "",
    mode: "",
    effort: "",
    timeoutMs: undefined,
    limit: undefined,
    statePath: "",
  };

  while (args.length > 0) {
    const argument = args.shift();
    if (argument === "--") {
      if (!options.prompt) {
        options.prompt = args.join(" ").trim();
      }
      break;
    }

    if (argument === "--help" || argument === "-h") {
      options.command = "help";
      continue;
    }
    if (argument === "--json") {
      options.json = true;
      continue;
    }
    if (argument === "--return-pending") {
      options.returnPending = true;
      continue;
    }

    const key = optionKey(argument);
    if (!key) {
      throw usageError(`Unexpected argument: ${argument}`);
    }
    const value = args.shift();
    if (value === undefined) {
      throw usageError(`Missing value for ${argument}`);
    }

    switch (key) {
      case "prompt":
      case "query":
      case "feature":
      case "model":
      case "mode":
      case "effort":
        options[key] = value;
        break;
      case "state-path":
        options.statePath = value;
        break;
      case "timeout-ms":
        options.timeoutMs = positiveInteger(value, argument);
        break;
      case "limit":
        options.limit = positiveInteger(value, argument);
        break;
      default:
        throw usageError(`Unknown option: ${argument}`);
    }
  }

  return options;
}

export async function runCli(argv, { stdin = process.stdin, stdout = process.stdout } = {}) {
  const options = parseCliArguments(argv);
  if (options.command === "help") {
    stdout.write(HELP);
    return { status: "help" };
  }

  if ((options.command === "ask" || options.command === "continue") && !options.prompt) {
    options.prompt = await readStdin(stdin);
  }

  let result;
  const statePath = options.statePath || defaultSessionPath();
  switch (options.command) {
    case "ask":
      requireValue(options.prompt, "A ChatGPT prompt");
      result = await runExtendedProRelay(compact({
        prompt: options.prompt,
        feature: options.feature,
        model: options.model,
        mode: options.mode,
        effort: options.effort,
        timeoutMs: options.timeoutMs,
        returnPending: options.returnPending,
        statePath,
        keepTab: true,
      }));
      break;
    case "continue":
      requireValue(options.query, "--query");
      requireValue(options.prompt, "A continuation prompt");
      result = await continueExtendedProRelay(compact({
        query: options.query,
        prompt: options.prompt,
        timeoutMs: options.timeoutMs,
        statePath,
        keepTab: true,
      }));
      break;
    case "poll":
      requireValue(options.query, "--query");
      result = await pollRelaySession(compact({
        query: options.query,
        timeoutMs: options.timeoutMs,
        statePath,
      }));
      break;
    case "list":
      result = await listRelaySessions(compact({
        query: options.query,
        limit: options.limit,
        statePath,
      }));
      break;
    default:
      throw usageError(`Unsupported command: ${options.command}`);
  }

  writeResult(result, { json: options.json, stdout });
  return result;
}

function optionKey(argument) {
  return argument.startsWith("--") ? argument.slice(2) : "";
}

function defaultSessionPath() {
  return process.env.GPT_RELAY_SESSION_PATH ||
    join(homedir(), ".codex", "gpt-relay", "sessions.json");
}

function positiveInteger(value, argument) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw usageError(`${argument} must be a positive integer.`);
  }
  return number;
}

function requireValue(value, label) {
  if (!String(value ?? "").trim()) {
    throw usageError(`${label} is required.`);
  }
}

async function readStdin(stdin) {
  if (stdin.isTTY) {
    return "";
  }

  const chunks = [];
  for await (const chunk of stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8").trim();
}

function compact(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== "")
  );
}

function writeResult(result, { json, stdout }) {
  if (!json && result?.status === "complete" && result.finalDeliveryText) {
    stdout.write(result.finalDeliveryText);
    return;
  }

  stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

function usageError(message) {
  const error = new Error(`${message}\n\n${HELP}`);
  error.code = "USAGE";
  return error;
}

async function main() {
  try {
    await runCli(process.argv.slice(2));
  } catch (error) {
    const code = error?.code ? ` [${error.code}]` : "";
    process.stderr.write(`GPT Relay error${code}: ${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
