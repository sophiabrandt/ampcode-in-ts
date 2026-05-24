// Usage string for --help
const USAGE = `Usage: ampcode-in-ts [options]

Options:
  -h, --help     Show this help
  -v, --version  Show version
`;

// CLI parses arguments, dispatches, and returns an exit code.
// Returns 0 on success, 1 on user error, 2 on system error.
export function CLI(args: string[]): number {
  const parsed = parseArgs(args);

  if (parsed.help) {
    process.stdout.write(USAGE);
    return 0;
  }

  if (parsed.version) {
    process.stdout.write("ampcode-in-ts dev\n");
    return 0;
  }

  // TODO: dispatch to subcommands / run agent loop
  return 0;
}

export interface ParsedArgs {
  help: boolean;
  version: boolean;
  // Add flags here as the app grows
}

export function parseArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {
    help: false,
    version: false,
  };

  for (const arg of args) {
    switch (arg) {
      case "-h":
      case "--help":
        result.help = true;
        break;
      case "-v":
      case "--version":
        result.version = true;
        break;
      default:
        // Unknown flag — will be handled by caller
        break;
    }
  }

  return result;
}
