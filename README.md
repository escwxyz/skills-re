# skills-re

Skills.re is an agent skills registry for discovering, publishing, installing, and serving reusable AI-agent skills. The project is a Bun/Turbo monorepo built around a TanStack Start web app, a Hono-based server/API surface, shared TypeScript packages, and Cloudflare-oriented infrastructure.

## What is here

- `apps/start` - the public web experience, built with React, TanStack Start, TanStack Router, Vite, Tailwind CSS, and Paraglide.
- `apps/server` - server routes, MCP endpoints, search/audit workflows, and integration code.
- `packages/api` - domain services for skills, collections, categories, reviews, newsletter flows, search, and usage.
- `packages/db` - Drizzle/libSQL database schema, migrations, seeds, and database utilities.
- `packages/auth` - Better Auth integration shared by the app and server.
- `packages/contract` - shared API contracts.
- `packages/cli` - the first-party `skills-re` CLI for searching, installing, syncing, and serving skills over MCP.
- `packages/infra` - deployment and infrastructure automation.
- `docs` - operational notes, design records, and rollout documentation.

## Stack

- Runtime and package manager: Bun
- Workspace orchestration: Turborepo
- Language: TypeScript
- Frontend: React 19, TanStack Start, Vite, Tailwind CSS
- Server: Hono, oRPC, MCP SDK
- Data: Drizzle ORM, libSQL, Cloudflare D1-compatible workflows
- Auth: Better Auth
- Quality: Ultracite, Oxlint, Oxfmt, TypeScript

## Getting started

Install dependencies:

```bash
bun install
```

Run the development workspace:

```bash
bun run dev
```

Useful focused commands:

```bash
bun run dev:server
bun run build
bun run check-types
bun x ultracite check
bun x ultracite fix
```

Database helpers:

```bash
bun run db:generate
bun run db:push
bun run db:seed
bun run db:seed:reset
```

Deployment helpers:

```bash
bun run deploy
bun run destroy
```

Local environment files live beside the apps and packages that consume them. Keep secrets out of commits and prefer the typed environment surfaces in `packages/env` when adding new configuration.

## CLI

The CLI package can be developed from `packages/cli`:

```bash
bun run build
bun packages/cli/src/main.ts --help
```

See [packages/cli/README.md](packages/cli/README.md) for command details, lockfile behavior, agent targets, authentication, and MCP usage.

## Search operations

Keyword search uses a D1 FTS5 path with LIKE and shadow rollout modes. See [docs/fts5-search-operations.md](docs/fts5-search-operations.md) for schema ownership, backfill/repair workflow, rollout checks, telemetry, and rollback steps.

## Contributing

Issues and pull requests are welcome. Before opening a PR, run the relevant checks for the files you touched:

```bash
bun run check-types
bun x ultracite check
```

For formatting and lint fixes, run:

```bash
bun x ultracite fix
```

## License

This project is licensed under the Apache 2.0 License. See [LICENSE](LICENSE) for details.
