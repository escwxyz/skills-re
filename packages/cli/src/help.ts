export const helpText = `skills-re

Usage:
  skills-re search <query> [--json]
  skills-re show <slug-or-path> [--json]
  skills-re install <skill[@version]> [--agent codex] [--dir .codex/skills]
  skills-re update [skill] [--agent codex]
  skills-re list [--json]
  skills-re lock --json
  skills-re read <name> [--agent codex]
  skills-re sync [--agent universal] [--output AGENTS.md]
  skills-re auth <login|status|logout>
  skills-re mcp

Global flags:
  --json            Print JSON where supported
  --yes             Skip safe confirmations
  --help            Show this help
  --version         Print version
`;
