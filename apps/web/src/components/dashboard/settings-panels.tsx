"use client";

import type { FormEvent } from "react";

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
  currentPassword: string;
  currentUserEmail?: string | null;
  createdSecret: string | null;
  isLoading: boolean;
  linkedCredentialAccount?: LinkedAccount | null;
  newPassword: string;
  onApiKeyNameChange: (value: string) => void;
  onChangePassword: (event: FormEvent<HTMLFormElement>) => void;
  onCreateApiKey: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteApiKey: (keyId: string) => void;
  onCurrentPasswordChange: (value: string) => void;
  onLinkProvider: (provider: SocialProvider) => void;
  onNewPasswordChange: (value: string) => void;
  onUnlinkAccount: (account: LinkedAccount) => void;
  pendingAction: string | null;
}

export function SettingsDashboardPanels({
  accounts,
  agentConfiguration,
  apiKeyName,
  apiKeys,
  currentPassword,
  currentUserEmail,
  createdSecret,
  isLoading,
  linkedCredentialAccount,
  newPassword,
  onApiKeyNameChange,
  onChangePassword,
  onCreateApiKey,
  onDeleteApiKey,
  onCurrentPasswordChange,
  onLinkProvider,
  onNewPasswordChange,
  onUnlinkAccount,
  pendingAction,
}: SettingsDashboardPanelsProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <IdentityLinksCard
          accounts={accounts}
          currentPassword={currentPassword}
          currentUserEmail={currentUserEmail}
          isLoading={isLoading}
          linkedCredentialAccount={linkedCredentialAccount}
          newPassword={newPassword}
          onCurrentPasswordChange={onCurrentPasswordChange}
          onLinkProvider={onLinkProvider}
          onNewPasswordChange={onNewPasswordChange}
          onSavePassword={onChangePassword}
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
