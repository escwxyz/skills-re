import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { AgentTarget } from "./targets";
import { listInstalledSkillMetadata } from "./read";

export const SKILLS_BLOCK_START = "<!-- SKILLS_RE:START -->";
export const SKILLS_BLOCK_END = "<!-- SKILLS_RE:END -->";

const replaceManagedBlock = (content: string, block: string) => {
  const start = content.indexOf(SKILLS_BLOCK_START);
  const end = content.indexOf(SKILLS_BLOCK_END);
  if (start !== -1 && end !== -1 && end > start) {
    return `${content.slice(0, start)}${block}${content.slice(end + SKILLS_BLOCK_END.length)}`;
  }
  const prefix = content.trimEnd();
  return prefix ? `${prefix}\n\n${block}\n` : `${block}\n`;
};

export const renderSkillsMetadataBlock = (input: {
  skills: { description: string; lockName: string; name: string }[];
  target: AgentTarget;
}) => {
  const skillsXml = input.skills
    .map(
      (skill) => `  <skill>
    <name>${skill.lockName}</name>
    <description>${skill.description}</description>
    <location>${input.target.name}</location>
  </skill>`,
    )
    .join("\n");

  return `${SKILLS_BLOCK_START}
<skills_system priority="1">

## Available Skills

<usage>
When a requested task matches an available skill, load it on demand with:
\`${input.target.readCommand}\`

Do not paste every skill into context up front. Use progressive disclosure.
</usage>

<available_skills>
${skillsXml}
</available_skills>

</skills_system>
${SKILLS_BLOCK_END}`;
};

export const syncAgentMetadata = async (input: {
  cwd: string;
  lockfilePath?: string;
  metadataPath: string;
  skillsDir: string;
  target: AgentTarget;
}) => {
  const skills = await listInstalledSkillMetadata(input.cwd, input.skillsDir, input.lockfilePath);
  const block = renderSkillsMetadataBlock({
    skills,
    target: input.target,
  });
  let existing = "";
  try {
    existing = await readFile(input.metadataPath, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  await mkdir(dirname(input.metadataPath), { recursive: true });
  const next = replaceManagedBlock(existing, block);
  await writeFile(input.metadataPath, next);
  return {
    metadataPath: input.metadataPath,
    skillsCount: skills.length,
  };
};
