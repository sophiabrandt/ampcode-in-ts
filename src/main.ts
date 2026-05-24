#!/usr/bin/env node
import { CLI } from "./cli.js";

process.exit(CLI(process.argv.slice(2)));
