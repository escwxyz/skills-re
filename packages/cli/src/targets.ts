import { join } from "node:path";

import { CliError } from "./errors";

export type AgentTargetName = "aider" | "claude" | "codex" | "cursor" | "universal" | "windsurf";

export interface AgentTarget {
  defaultMetadataPath: string;
  defaultSkillsDir: string;
  name: AgentTargetName;
  readCommand: string;
}

export const agentTargets: Record<AgentTargetName, AgentTarget> = {
  aider: {
    defaultMetadataPath: "AGENTS.md",
    defaultSkillsDir: ".aider/skills",
    name: "aider",
    readCommand: "skills-re read <skill-name> --agent aider",
  },
  claude: {
    defaultMetadataPath: "CLAUDE.md",
    defaultSkillsDir: ".claude/skills",
    name: "claude",
    readCommand: "skills-re read <skill-name> --agent claude",
  },
  codex: {
    defaultMetadataPath: "AGENTS.md",
    defaultSkillsDir: ".codex/skills",
    name: "codex",
    readCommand: "skills-re read <skill-name> --agent codex",
  },
  cursor: {
    defaultMetadataPath: ".cursor/rules/skills-re.mdc",
    defaultSkillsDir: ".cursor/skills",
    name: "cursor",
    readCommand: "skills-re read <skill-name> --agent cursor",
  },
  universal: {
    defaultMetadataPath: "AGENTS.md",
    defaultSkillsDir: ".agent/skills",
    name: "universal",
    readCommand: "skills-re read <skill-name> --agent universal",
  },
  windsurf: {
    defaultMetadataPath: "AGENTS.md",
    defaultSkillsDir: ".windsurf/skills",
    name: "windsurf",
    readCommand: "skills-re read <skill-name> --agent windsurf",
  },
};

export const supportedAgentTargets = Object.keys(agentTargets) as AgentTargetName[];

export const resolveAgentTarget = (name: string | undefined = "codex"): AgentTarget => {
  if (name in agentTargets) {
    return agentTargets[name as AgentTargetName];
  }
  throw new CliError(
    `Unsupported agent target "${name}". Supported targets: ${supportedAgentTargets.join(", ")}`,
  );
};

export const resolveSkillsDir = (cwd: string, target: AgentTarget, explicitDir?: string) =>
  explicitDir ?? join(cwd, target.defaultSkillsDir);

export const resolveMetadataPath = (cwd: string, target: AgentTarget, explicitPath?: string) =>
  explicitPath ?? join(cwd, target.defaultMetadataPath);
