import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { parseArgs, resolveConfig } from "./cli.js";

// ── parseArgs ────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("returns empty overrides when no flags given", () => {
    expect(parseArgs([])).toEqual({});
  });

  it("parses -key", () => {
    expect(parseArgs(["-key", "sk-123"])).toEqual({ apiKey: "sk-123" });
  });

  it("parses -model", () => {
    expect(parseArgs(["-model", "gpt-4"])).toEqual({ model: "gpt-4" });
  });

  it("parses -url", () => {
    expect(parseArgs(["-url", "https://api.example.com"])).toEqual({
      baseUrl: "https://api.example.com",
    });
  });

  it("parses -system", () => {
    expect(parseArgs(["-system", "Be concise"])).toEqual({
      systemMsg: "Be concise",
    });
  });

  it("parses -t", () => {
    expect(parseArgs(["-t", "60"])).toEqual({ timeoutSec: 60 });
  });

  it("parses multiple flags", () => {
    expect(
      parseArgs(["-key", "sk-abc", "-model", "gpt-4", "-t", "30"]),
    ).toEqual({ apiKey: "sk-abc", model: "gpt-4", timeoutSec: 30 });
  });

  it("returns 'help' for -h", () => {
    expect(parseArgs(["-h"])).toBe("help");
  });

  it("returns 'help' for --help", () => {
    expect(parseArgs(["--help"])).toBe("help");
  });

  it("returns 'version' for -version", () => {
    expect(parseArgs(["-version"])).toBe("version");
  });

  it("help/version shortcuts even when other flags precede them", () => {
    // The first instance of help/version wins because we follow flag order.
    expect(parseArgs(["-key", "sk", "-h", "-model", "gpt-4"])).toBe("help");
  });

  it("throws on unknown flag", () => {
    expect(() => parseArgs(["-foo"])).toThrow("unknown flag: -foo");
  });

  it("throws when -key has no value", () => {
    expect(() => parseArgs(["-key"])).toThrow("-key requires a value");
  });

  it("throws when -model has no value", () => {
    expect(() => parseArgs(["-model"])).toThrow("-model requires a value");
  });

  it("throws when -url has no value", () => {
    expect(() => parseArgs(["-url"])).toThrow("-url requires a value");
  });

  it("throws when -system has no value", () => {
    expect(() => parseArgs(["-system"])).toThrow("-system requires a value");
  });

  it("throws when -t has no value", () => {
    expect(() => parseArgs(["-t"])).toThrow("-t requires a value");
  });

  it("throws when -t has non-numeric value", () => {
    expect(() => parseArgs(["-t", "foo"])).toThrow("-t requires a number, got: foo");
  });

  it("throws when -t has empty string value", () => {
    expect(() => parseArgs(["-t", ""])).toThrow("-t requires a number, got: ");
  });
});

// ── resolveConfig ────────────────────────────────────────────────────

const ENV_KEY = "CODE_AGENT_API_KEY";

describe("resolveConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env[ENV_KEY];
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("applies all defaults when no overrides and env has key", () => {
    process.env[ENV_KEY] = "env-key";
    const config = resolveConfig({});
    expect(config).toEqual({
      apiKey: "env-key",
      model: "openai/gpt-oss-20b",
      baseUrl: "https://openrouter.ai/api/v1",
      systemMsg: "You are a helpful coding assistant. Reply concisely.",
      timeoutSec: 120,
    });
  });

  it("overrides apiKey from overrides, not env", () => {
    process.env[ENV_KEY] = "env-key";
    const config = resolveConfig({ apiKey: "flag-key" });
    expect(config.apiKey).toBe("flag-key");
  });

  it("falls back to env var when overrides have no apiKey", () => {
    process.env[ENV_KEY] = "env-key";
    const config = resolveConfig({});
    expect(config.apiKey).toBe("env-key");
  });

  it("throws when no apiKey in overrides or env", () => {
    expect(() => resolveConfig({})).toThrow("API key required");
  });

  it("throws when apiKey is empty string", () => {
    process.env[ENV_KEY] = "";
    expect(() => resolveConfig({})).toThrow("API key required");
  });

  it("strips trailing slashes from baseUrl", () => {
    process.env[ENV_KEY] = "k";
    const config = resolveConfig({ baseUrl: "https://api.example.com///" });
    expect(config.baseUrl).toBe("https://api.example.com");
  });

  it("strips trailing slashes from default baseUrl", () => {
    // Default has no trailing slash, but just verifying it doesn't mangle.
    process.env[ENV_KEY] = "k";
    const config = resolveConfig({});
    expect(config.baseUrl).toBe("https://openrouter.ai/api/v1");
  });

  it("overrides model", () => {
    process.env[ENV_KEY] = "k";
    expect(resolveConfig({ model: "custom-model" }).model).toBe(
      "custom-model",
    );
  });

  it("overrides systemMsg", () => {
    process.env[ENV_KEY] = "k";
    expect(resolveConfig({ systemMsg: "hello" }).systemMsg).toBe("hello");
  });

  it("overrides timeoutSec", () => {
    process.env[ENV_KEY] = "k";
    expect(resolveConfig({ timeoutSec: 30 }).timeoutSec).toBe(30);
  });
});
