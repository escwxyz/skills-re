export const helpText = `skills-re

Usage:
  skills-re search <query> [--json]
      Search the public registry for skills matching your query.

  skills-re show <slug-or-path> [--json]
      Show details for a single skill by slug or GitHub path.

  skills-re install <author/repo/skill[@version]> [--agent codex] [--dir .codex/skills]
      Install a skill from the registry or a GitHub repository into a local agent runtime.

  skills-re update [skill] [--agent codex]
      Update installed skill versions for the selected agent runtime.

  skills-re list [--json]
      List installed skills from the lockfile.

  skills-re lock --json
      Print the current lockfile contents as JSON.

  skills-re read <name> [--agent codex]
      Read the raw installed skill content from the local agent skills directory.

  skills-re sync [--agent universal] [--output AGENTS.md]
      Sync installed skills into agent metadata files such as AGENTS.md.

  skills-re auth <login|status|logout>
      Authenticate with skills.re, inspect auth state, or log out.

  skills-re mcp [--remote-config]
      Run the MCP helper command with optional remote config.

Global flags:
  --json            Print JSON where supported.
  --yes             Skip safe confirmations for non-interactive use.
  --help            Show this help.
  --version         Print version.
`;
