import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

export const DEFAULT_API_URL = "https://api.skills.re";
export const DEFAULT_SITE_URL = "https://skills.re";

export interface StoredCredential {
  apiUrl: string;
  expiresAt?: string;
  token: string;
  user?: {
    email?: string;
    id?: string;
    name?: string;
  };
}

export const getConfigDir = (env = process.env) =>
  env.SKILLS_RE_CONFIG_DIR ?? join(homedir(), ".config", "skills-re");

export const getCredentialPath = (env = process.env) => join(getConfigDir(env), "credentials.json");

export const readCredential = async (env = process.env): Promise<StoredCredential | null> => {
  try {
    const content = await readFile(getCredentialPath(env), "utf-8");
    const parsed = JSON.parse(content) as StoredCredential;
    return typeof parsed.token === "string" && typeof parsed.apiUrl === "string" ? parsed : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
};

export const writeCredential = async (credential: StoredCredential, env = process.env) => {
  const filePath = getCredentialPath(env);
  await mkdir(dirname(filePath), { recursive: true, mode: 0o700 });
  await writeFile(filePath, `${JSON.stringify(credential, null, 2)}\n`, { mode: 0o600 });
};

export const deleteCredential = async (env = process.env) => {
  await rm(getCredentialPath(env), { force: true });
};
