import { readFileSync } from "node:fs";
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
