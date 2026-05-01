export type SocialProvider = "github" | "google";

export interface LinkedAccount {
  accountId: string;
  createdAt: string | Date;
  id: string;
  providerId: string;
  scopes: string[];
  updatedAt: string | Date;
}

export interface ApiKeyItem {
  createdAt: string | Date;
  enabled: boolean;
  expiresAt: string | Date | null;
  id: string;
  lastRequest: string | Date | null;
  name: string | null;
  prefix: string | null;
  remaining: number | null;
  requestCount: number;
  start: string | null;
  updatedAt: string | Date;
}

export interface AgentConfiguration {
  algorithms?: string[];
  approval_methods?: string[];
  default_location?: string;
  description?: string;
  endpoints?: Record<string, string>;
  issuer?: string;
  jwks_uri?: string;
  modes?: string[];
  provider_description?: string;
  provider_name?: string;
  version?: string;
}

export const providerMeta: Record<SocialProvider, { label: string }> = {
  github: {
    label: "GitHub",
  },
  google: {
    label: "Google",
  },
};

export const formatProviderLabel = (providerId: string) => {
  if (providerId === "credential") {
    return "Email";
  }

  return providerMeta[providerId as SocialProvider]?.label ?? providerId;
};
