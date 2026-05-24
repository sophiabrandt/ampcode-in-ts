#!/usr/bin/env node
import { CLI } from "./cli.js";

const version = "dev";
const commit = "none";

const code = CLI(process.argv.slice(2), version, commit);
// cli.ts handles its own process.exit for async path.
// If it returned a sync code, use it.
if (code >= 0) {
  process.exit(code);
}
