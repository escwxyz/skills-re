import { listPublicAgentSkillArtifacts, getAgentSkillArtifactBySnapshotId } from "./repo";

export const AGENT_SKILLS_DISCOVERY_SCHEMA_URL =
  "https://schemas.agentskills.io/discovery/0.2.0/schema.json";

export const AGENT_SKILL_MD_TYPE = "skill-md" as const;

const AGENT_SKILL_NAME_PATTERN = /^(?!-)(?!.*--)(?!.*-$)[a-z0-9-]{1,64}$/;
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;

export interface AgentSkillDiscoverySourceRow {
  description: string | null;
  fileHash: string | null;
  latestSnapshotId: string | null;
  name: string | null;
  r2Key: string | null;
  slug: string | null;
}

export interface AgentSkillDiscoveryArtifactMetadata {
  contentType: string | null;
  fileHash: string;
  path: string;
  r2Key: string;
  size: number;
  snapshotId: string;
}

export interface AgentSkillDiscoveryIndexEntry {
  description: string;
  digest: string;
  name: string;
  type: typeof AGENT_SKILL_MD_TYPE;
  url: string;
}

export interface AgentSkillsDiscoveryIndex {
  $schema: typeof AGENT_SKILLS_DISCOVERY_SCHEMA_URL;
  skills: AgentSkillDiscoveryIndexEntry[];
}

export interface AgentSkillsDiscoveryServiceDeps {
  getAgentSkillArtifactBySnapshotId: (
    snapshotId: string,
  ) => Promise<AgentSkillDiscoveryArtifactMetadata | null>;
  listPublicAgentSkillArtifacts: () => Promise<AgentSkillDiscoverySourceRow[]>;
}

const defaultDeps: AgentSkillsDiscoveryServiceDeps = {
  getAgentSkillArtifactBySnapshotId,
  listPublicAgentSkillArtifacts,
};

const toArtifactUrl = (snapshotId: string) =>
  `/.well-known/agent-skills/${encodeURIComponent(snapshotId)}/SKILL.md`;

const toDiscoveryEntry = (
  row: AgentSkillDiscoverySourceRow,
): AgentSkillDiscoveryIndexEntry | null => {
  const name = row.slug?.trim() ?? "";
  const description = row.description?.trim() ?? "";
  const snapshotId = row.latestSnapshotId?.trim() ?? "";
  const fileHash = row.fileHash?.trim().toLowerCase() ?? "";
  const hasFetchableArtifact = Boolean(row.r2Key?.trim());

  if (
    !(
      AGENT_SKILL_NAME_PATTERN.test(name) &&
      description &&
      snapshotId &&
      SHA256_HEX_PATTERN.test(fileHash) &&
      hasFetchableArtifact
    )
  ) {
    return null;
  }

  return {
    description,
    digest: `sha256:${fileHash}`,
    name,
    type: AGENT_SKILL_MD_TYPE,
    url: toArtifactUrl(snapshotId),
  };
};

export const createAgentSkillsDiscoveryService = (
  deps: Partial<AgentSkillsDiscoveryServiceDeps> = {},
) => {
  const activeDeps = {
    ...defaultDeps,
    ...deps,
  };

  return {
    async getArtifactMetadata(input: {
      snapshotId: string;
    }): Promise<AgentSkillDiscoveryArtifactMetadata | null> {
      const snapshotId = input.snapshotId.trim();
      if (!snapshotId) {
        return null;
      }

      const artifact = await activeDeps.getAgentSkillArtifactBySnapshotId(snapshotId);
      if (!(artifact?.r2Key && SHA256_HEX_PATTERN.test(artifact.fileHash.toLowerCase()))) {
        return null;
      }

      return {
        ...artifact,
        fileHash: artifact.fileHash.toLowerCase(),
      };
    },

    async getDiscoveryIndex(): Promise<AgentSkillsDiscoveryIndex> {
      const rows = await activeDeps.listPublicAgentSkillArtifacts();
      const skills = rows
        .map(toDiscoveryEntry)
        .filter((entry): entry is AgentSkillDiscoveryIndexEntry => entry !== null)
        .toSorted(
          (left, right) => left.name.localeCompare(right.name) || left.url.localeCompare(right.url),
        );

      return {
        $schema: AGENT_SKILLS_DISCOVERY_SCHEMA_URL,
        skills,
      };
    },
  };
};

export const agentSkillsDiscoveryService = createAgentSkillsDiscoveryService();
