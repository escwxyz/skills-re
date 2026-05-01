"use client";

import type {
  AgentConfiguration,
  ApiKeyItem,
  LinkedAccount,
  SocialProvider,
} from "./settings-data";

import { AgentAccessCard } from "./settings-agent-access-card";
import { ApiKeysCard } from "./settings-api-keys-card";
import { IdentityLinksCard } from "./settings-identity-links-card";

export { SettingsAlerts } from "./settings-alerts";
export type {
  AgentConfiguration,
  ApiKeyItem,
  LinkedAccount,
  SocialProvider,
} from "./settings-data";

interface SettingsDashboardPanelsProps {
  accounts: LinkedAccount[];
  agentConfiguration: AgentConfiguration | null;
  apiKeyName: string;
  apiKeys: ApiKeyItem[];
  currentUserEmail?: string | null;
  createdSecret: string | null;
  isLoading: boolean;
  linkedCredentialAccount?: LinkedAccount | null;
  onApiKeyNameChange: (value: string) => void;
  onCreateApiKey: (event: React.FormEvent<HTMLFormElement>) => void;
  onDeleteApiKey: (keyId: string) => void;
  onLinkProvider: (provider: SocialProvider) => void;
  onSavePassword: (values: { currentPassword: string; newPassword: string }) => Promise<boolean>;
  onUnlinkAccount: (account: LinkedAccount) => void;
  pendingAction: string | null;
}

export function SettingsDashboardPanels({
  accounts,
  agentConfiguration,
  apiKeyName,
  apiKeys,
  currentUserEmail,
  createdSecret,
  isLoading,
  linkedCredentialAccount,
  onApiKeyNameChange,
  onCreateApiKey,
  onDeleteApiKey,
  onLinkProvider,
  onSavePassword,
  onUnlinkAccount,
  pendingAction,
}: SettingsDashboardPanelsProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <IdentityLinksCard
          accounts={accounts}
          currentUserEmail={currentUserEmail}
          isLoading={isLoading}
          linkedCredentialAccount={linkedCredentialAccount}
          onLinkProvider={onLinkProvider}
          onSavePassword={onSavePassword}
          onUnlinkAccount={onUnlinkAccount}
          pendingAction={pendingAction}
        />

        <ApiKeysCard
          apiKeyName={apiKeyName}
          apiKeys={apiKeys}
          createdSecret={createdSecret}
          isLoading={isLoading}
          onApiKeyNameChange={onApiKeyNameChange}
          onCreateApiKey={onCreateApiKey}
          onDeleteApiKey={onDeleteApiKey}
          pendingAction={pendingAction}
        />
      </div>

      <AgentAccessCard agentConfiguration={agentConfiguration} isLoading={isLoading} />
    </div>
  );
}
