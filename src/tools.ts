import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve, sep, posix } from "node:path";
import type { ToolDefinition } from "./api.js";

export function readFile(input: unknown): string {
  return readFileSync((input as { path: string }).path, "utf-8");
}

export const readFileDefinition: ToolDefinition = {
  name: "read_file",
  description:
    "Read the contents of a given relative file path. Use this when you want to see what's inside a file. Do not use this with directory names.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "The relative path of a file in the working directory.",
      },
    },
    required: ["path"],
    additionalProperties: false,
  },
  function: readFile,
};

export function listFiles(input: unknown): string {
  const dir = (input as { path?: string }).path ?? ".";
  const base = resolve(dir);
  const files: string[] = [];

  function walk(current: string) {
    const entries = readdirSync(current, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      const relPath = relative(base, fullPath).replaceAll(sep, posix.sep);
      if (entry.isDirectory()) {
        files.push(relPath + "/");
        walk(fullPath);
      } else {
        files.push(relPath);
      }
    }
  }

  walk(base);
  return JSON.stringify(files);
}

export const listFilesDefinition: ToolDefinition = {
  name: "list_files",
  description:
    "List files and directories at a given path. If no path is provided, lists files in the current directory.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description:
          "Optional relative path to list files from. Defaults to current directory if not provided.",
      },
    },
    required: [],
    additionalProperties: false,
  },
  function: listFiles,
};
