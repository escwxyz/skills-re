# @skills-re/cli

First-party CLI for skills.re — discover, install, and manage skills for your AI agent.

## Install

```bash
npm install -g @skills-re/cli
skills-re --help
```

During local development:

```bash
bun run build          # from packages/cli/
bun packages/cli/src/main.ts --help
```

## Commands

```bash
skills-re search "testing" [--json] [--category <csv>] [--tag <csv>] [--sort <sort>] [--limit <n>]
skills-re show <slug-or-path> [--json]
skills-re install <author/repo/skill[@version]> [--agent codex] [--dir .codex/skills]
skills-re install <github-url> [--git] [--agent codex]
skills-re update [skill] [--agent codex]
skills-re list [--json]
skills-re lock --json
skills-re read <name> [--agent codex]
skills-re sync [--agent universal] [--output AGENTS.md]
skills-re auth login
skills-re auth status
skills-re auth logout
skills-re mcp [--remote-config]
```

The `search` command uses the registry's keyword index.

## Configuration

| Flag         | Description                                       |
| ------------ | ------------------------------------------------- |
| `--json`     | Emit machine-readable JSON for supported commands |
| `--yes`      | Skip interactive confirmations where safe         |
| `--help`     | Show help                                         |
| `--version`  | Print version                                     |
| `NO_COLOR=1` | Disable terminal styling                          |

## Lockfile

The CLI reads and writes `skills-lock.json` in the current working directory by default.

```json
{
  "version": 1,
  "skills": {
    "example": {
      "source": "owner/repo",
      "sourceType": "github",
      "sourceUrl": "https://github.com/owner/repo",
      "ref": "abc1234",
      "skillPath": "skills/example/SKILL.md",
      "archiveHash": "sha256:...",
      "version": "1.0.0",
      "installedAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

Pass `--lockfile <path>` to use a custom location.

## Agent Targets

Default target is `codex`. Pass `--agent <name>` to override.

| Target      | Skills dir         | Metadata file                 |
| ----------- | ------------------ | ----------------------------- |
| `codex`     | `.codex/skills`    | `AGENTS.md`                   |
| `claude`    | `.claude/skills`   | `CLAUDE.md`                   |
| `cursor`    | `.cursor/skills`   | `.cursor/rules/skills-re.mdc` |
| `windsurf`  | `.windsurf/skills` | `AGENTS.md`                   |
| `aider`     | `.aider/skills`    | `AGENTS.md`                   |
| `universal` | `.agent/skills`    | `AGENTS.md`                   |

`sync` updates only the managed Skills.re block and preserves unrelated content.

## Authentication

`auth login` opens a browser-based device code flow and stores a credential locally.
`auth status` shows the current login state.
`auth logout` revokes and clears the stored credential.

## MCP

`skills-re mcp` starts a local stdio MCP server with filesystem-scoped tools:

- `install_skill` — install a skill into the local agent directory
- `read_installed_skill` — read an installed skill on demand
- `sync_skills_metadata` — update the agent metadata block

`https://api.skills.re/mcp` is the remote Streamable HTTP server with catalog and library tools:
`search_skills`, `get_skill`, `get_my_saved_skills`, `save_skill`, `unsave_skill`,
`record_skill_usage`, `get_my_recently_used`, `get_skill_recommendations`.

Run `skills-re mcp --remote-config` to print the full MCP configuration shape for agent hosts.

## Publish Validation

```bash
bun run test
bun run check-types
bun run build
cd packages/cli && npm pack --dry-run
```
