// CLI entry: flag parsing, env var resolution, conversation loop.

import * as readline from "node:readline";
import type { Message } from "./api.js";
import { sendCompletion } from "./api.js";
import { readFileDefinition, listFilesDefinition } from "./tools.js";

const USAGE = `Usage: ampcode-in-ts [options]

Options:
  -key     API key (or set CODE_AGENT_API_KEY env var)
  -model   Model identifier (default: openai/gpt-oss-20b)
  -url     OpenAI-compatible API base URL (default: https://openrouter.ai/api/v1)
  -system  System prompt
  -t       Request timeout in seconds (default: 120)
  -version Print version and exit
  -h       Show this help
`;

interface AppConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  systemMsg: string;
  timeoutSec: number;
}

interface ParsedArgs {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  systemMsg?: string;
  timeoutSec?: number;
}

/** CLI is the entry point. Returns an exit code. */
export function CLI(args: string[], version: string, commit: string): number {
  try {
    const parsed = parseArgs(args);
    if (parsed === "help") {
      process.stdout.write(USAGE);
      return 0;
    }
    if (parsed === "version") {
      process.stdout.write(`code-agent ${version} (${commit})\n`);
      return 0;
    }
    const config = resolveConfig(parsed);
    run(config).catch((err) => {
      process.stderr.write(`Error: ${String(err)}\n`);
      process.exit(2);
    });
    return -1; // sentinel: caller must not exit — process handles it
  } catch (err: unknown) {
    process.stderr.write(`Error: ${String(err)}\n`);
    return 1;
  }
}

/** parseArgs extracts flag overrides from argv. Returns a sentinel for early exits. */
export function parseArgs(args: string[]): ParsedArgs | "help" | "version" {
  const overrides: ParsedArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    switch (arg) {
      case "-key": {
        const val = args[++i];
        if (val === undefined) throw new Error("-key requires a value");
        overrides.apiKey = val;
        break;
      }
      case "-model": {
        const val = args[++i];
        if (val === undefined) throw new Error("-model requires a value");
        overrides.model = val;
        break;
      }
      case "-url": {
        const val = args[++i];
        if (val === undefined) throw new Error("-url requires a value");
        overrides.baseUrl = val;
        break;
      }
      case "-system": {
        const val = args[++i];
        if (val === undefined) throw new Error("-system requires a value");
        overrides.systemMsg = val;
        break;
      }
      case "-t": {
        const val = args[++i];
        if (val === undefined) throw new Error("-t requires a value");
        const n = parseFloat(val);
        if (isNaN(n)) throw new Error(`-t requires a number, got: ${val}`);
        overrides.timeoutSec = n;
        break;
      }
      case "-h":
      case "--help":
        return "help";
      case "-version":
        return "version";
      default:
        throw new Error(`unknown flag: ${arg}`);
    }
  }

  return overrides;
}

/** resolveConfig fills defaults, resolves env vars, and validates the final config. */
export function resolveConfig(overrides: ParsedArgs): AppConfig {
  const config: AppConfig = {
    apiKey: overrides.apiKey ?? "",
    model: overrides.model ?? "openai/gpt-oss-20b",
    baseUrl: overrides.baseUrl ?? "https://openrouter.ai/api/v1",
    systemMsg: overrides.systemMsg ?? "You are a helpful coding assistant. Reply concisely.",
    timeoutSec: overrides.timeoutSec ?? 120,
  };

  // Resolve API key: flag > env var
  if (!config.apiKey) {
    config.apiKey = process.env["CODE_AGENT_API_KEY"] ?? "";
  }
  if (!config.apiKey) {
    throw new Error(`API key required. Use -key flag or CODE_AGENT_API_KEY env var.\n\n${USAGE}`);
  }

  return config;
}

async function run(config: AppConfig): Promise<void> {
  const tools = [readFileDefinition, listFilesDefinition];

  const messages: Message[] = [
    { role: "system", content: config.systemMsg },
  ];

  process.stdout.write("Code Agent (Ctrl+C to exit)\n");
  process.stdout.write("─────────────────────────────\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  if (!process.stdin.isTTY) {
    let pipedInput = "";
    for await (const chunk of process.stdin) {
      pipedInput += chunk;
    }
    const input = pipedInput.trim();
    if (input === "") {
      process.exit(0);
    }
    messages.push({ role: "user", content: input });
    try {
      const response = await sendCompletion(
        config.apiKey,
        config.model,
        config.baseUrl,
        config.timeoutSec,
        messages,
        tools,
      );
      process.stdout.write(`${response}\n`);
    } catch (err) {
      process.stderr.write(`Error: ${String(err)}\n`);
    }
    process.exit(0);
  }

  const prompt = () => {
    rl.question("\n> ", async (input) => {
      const trimmed = input.trim();
      if (trimmed === "exit" || trimmed === "quit") {
        rl.close();
        process.exit(0);
      }
      if (trimmed === "") {
        prompt();
        return;
      }

      messages.push({ role: "user", content: trimmed });

      try {
        const response = await sendCompletion(
          config.apiKey,
          config.model,
          config.baseUrl,
          config.timeoutSec,
          messages,
          tools,
        );
        messages.push({ role: "assistant", content: response });
        process.stdout.write(`\n${response}\n`);
      } catch (err) {
        process.stderr.write(`\nError: ${String(err)}\n`);
        // Remove the failed user message
        messages.pop();
      }

      prompt();
    });
  };

  prompt();
}
