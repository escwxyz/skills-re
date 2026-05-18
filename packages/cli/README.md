# @skills-re/cli

First-party CLI for Skills.re.

## Install

```bash
npm install -g @skills-re/cli
skills-re --help
```

During local development:

```bash
bun --filter @skills-re/cli build
bun packages/cli/src/main.ts --help
```

## Configuration

- `--api-url <url>` overrides the API origin for one command.
- `SKILLS_RE_API_URL` overrides the default API origin.
- `--json` emits machine-readable output for supported commands.
- `--yes` skips interactive confirmations where safe.
- `NO_COLOR=1` disables terminal styling.

## Commands

```bash
skills-re search "testing" --json
skills-re show my-skill
skills-re install my-skill --agent codex --dir .codex/skills
skills-re update --agent universal
skills-re list
skills-re lock --json
skills-re read my-skill
skills-re sync --agent universal
skills-re auth status
skills-re mcp
```

## Lockfile

The CLI reads and writes `skills-lock.json` in the current working directory by default.
Entries preserve the existing lockfile shape:

```json
{
  "version": 1,
  "skills": {
    "example": {
      "source": "owner/repo",
      "sourceType": "github",
      "skillPath": "skills/example/SKILL.md",
      "computedHash": "sha256"
    }
  }
}
```

## Agent Targets

Supported targets:

- `codex`: `.codex/skills`, metadata in `AGENTS.md`
- `claude`: `.claude/skills`, metadata in `CLAUDE.md`
- `cursor`: `.cursor/skills`, metadata in `.cursor/rules/skills-re.mdc`
- `windsurf`: `.windsurf/skills`, metadata in `AGENTS.md`
- `aider`: `.aider/skills`, metadata in `AGENTS.md`
- `universal`: `.agent/skills`, metadata in `AGENTS.md`

`sync` updates only the managed Skills.re block and preserves unrelated content.

## Publish Validation

```bash
bun --filter @skills-re/cli test
bun --filter @skills-re/cli check-types
bun --filter @skills-re/cli build
cd packages/cli && npm pack --dry-run
```

## MVP Limitations

- Public search/show/install flows are implemented first; protected write workflows depend on server-side auth rollout.
- `auth login` expects the server CLI auth start endpoint to return a browser/device flow and, when available, a short-lived CLI token.
- The MCP bridge intentionally exposes a narrow local tool surface: search, show, read, sync, and install.
- Install/update uses immutable Skills.re snapshot archives and does not clone arbitrary Git repositories directly.
- Agent target adapters cover common directory and metadata conventions, but individual tools may evolve their preferred metadata files over time.
