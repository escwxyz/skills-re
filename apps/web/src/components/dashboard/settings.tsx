"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { authClient } from "@/lib/auth-client";
import { localizeHref } from "@/paraglide/runtime";

import { buttonVariants } from "@/components/ui/button";
import type { CurrentUser } from "./shared";
import { DashboardSection } from "./shared";
import { SettingsAlerts, SettingsDashboardPanels } from "./settings-panels";
import type {
  AgentConfiguration,
  ApiKeyItem,
  LinkedAccount,
  SocialProvider,
} from "./settings-panels";

const dashboardSettingsPath = localizeHref("/dashboard/settings");

const toDisplayError = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

interface Props {
  currentUser?: CurrentUser | null;
}

export function DashboardSettings({ currentUser }: Props) {
  const displayHandle =
    currentUser?.github ?? currentUser?.email?.split("@")[0] ?? currentUser?.id ?? "dashboard";

  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [agentConfiguration, setAgentConfiguration] = useState<AgentConfiguration | null>(null);
  const [apiKeyName, setApiKeyName] = useState("");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadSettings = async () => {
      setIsLoading(true);

      try {
        const [accountsResult, apiKeysResult, agentResult] = await Promise.all([
          authClient.listAccounts().catch((error: unknown) => ({ data: null, error })),
          authClient.apiKey
            .list({
              query: {
                limit: 20,
                sortBy: "createdAt",
                sortDirection: "desc",
              },
            })
            .catch((error: unknown) => ({ data: null, error })),
          fetch(localizeHref("/.well-known/agent-configuration"))
            .then(async (response) => {
              if (!response.ok) {
                throw new Error(`Failed to load agent discovery document (${response.status}).`);
              }

              return { data: (await response.json()) as AgentConfiguration, error: null };
            })
            .catch((error: unknown) => ({ data: null, error })),
        ]);

        if (!isActive) {
          return;
        }

        const nextErrors: string[] = [];

        if (accountsResult.data) {
          setAccounts(accountsResult.data as LinkedAccount[]);
        } else {
          setAccounts([]);
          if (accountsResult.error) {
            nextErrors.push(
              toDisplayError(accountsResult.error, "Failed to load linked accounts."),
            );
          }
        }

        if (apiKeysResult.data) {
          setApiKeys((apiKeysResult.data as { apiKeys: ApiKeyItem[] }).apiKeys ?? []);
        } else {
          setApiKeys([]);
          if (apiKeysResult.error) {
            nextErrors.push(toDisplayError(apiKeysResult.error, "Failed to load API keys."));
          }
        }

        if (agentResult.data) {
          setAgentConfiguration(agentResult.data as AgentConfiguration);
        } else {
          setAgentConfiguration(null);
          if (agentResult.error) {
            nextErrors.push(
              toDisplayError(agentResult.error, "Failed to load agent discovery data."),
            );
          }
        }

        setErrorMessage(nextErrors.length > 0 ? nextErrors.join(" ") : null);
        setStatusMessage(null);
      } catch (error) {
        if (isActive) {
          setErrorMessage(toDisplayError(error, "Failed to load settings."));
          setStatusMessage(null);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      isActive = false;
    };
  }, [refreshToken]);

  const requestRefresh = () => {
    setRefreshToken((value) => value + 1);
  };

  const handleLinkProvider = async (provider: SocialProvider) => {
    setPendingAction(`link-${provider}`);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      await authClient.linkSocial({
        callbackURL: dashboardSettingsPath,
        provider,
      });
    } catch (error) {
      setErrorMessage(toDisplayError(error, "Unable to start account linking."));
    } finally {
      setPendingAction(null);
    }
  };

  const handleUnlinkAccount = async (account: LinkedAccount) => {
    if (accounts.length <= 1) {
      setErrorMessage("Keep at least one account connected before removing another one.");
      return;
    }

    setPendingAction(`unlink-${account.id}`);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const result = (await authClient.unlinkAccount({
        accountId: account.accountId,
        providerId: account.providerId,
      })) as { data: { status?: boolean } | null; error: unknown };

      if (result.error) {
        setErrorMessage(toDisplayError(result.error, "Unable to unlink the account."));
        return;
      }

      setStatusMessage("Account removed.");
      requestRefresh();
    } catch (error) {
      setErrorMessage(toDisplayError(error, "Unable to unlink the account."));
    } finally {
      setPendingAction(null);
    }
  };

  const handleCreateApiKey = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = apiKeyName.trim();

    setPendingAction("create-api-key");
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const result = (await authClient.apiKey.create({
        name: trimmedName || undefined,
      })) as {
        data: { key: string } | null;
        error: unknown;
      };

      if (result.error || !result.data?.key) {
        setErrorMessage(toDisplayError(result.error, "Unable to create an API key."));
        return;
      }

      setCreatedSecret(result.data.key);
      setApiKeyName("");
      setStatusMessage("API key generated. Copy the secret now, it will not be shown again.");
      requestRefresh();
    } catch (error) {
      setErrorMessage(toDisplayError(error, "Unable to create an API key."));
    } finally {
      setPendingAction(null);
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    setPendingAction(`delete-api-key-${keyId}`);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const result = (await authClient.apiKey.delete({ keyId })) as {
        data: { success?: boolean } | null;
        error: unknown;
      };

      if (result.error) {
        setErrorMessage(toDisplayError(result.error, "Unable to delete the API key."));
        return;
      }

      setStatusMessage("API key revoked.");
      requestRefresh();
    } catch (error) {
      setErrorMessage(toDisplayError(error, "Unable to delete the API key."));
    } finally {
      setPendingAction(null);
    }
  };

  const handleSetPassword = async ({
    currentPassword,
    newPassword,
  }: {
    currentPassword: string;
    newPassword: string;
  }): Promise<boolean> => {
    const trimmedCurrentPassword = currentPassword.trim();
    const trimmedPassword = newPassword.trim();

    if (!trimmedCurrentPassword) {
      setErrorMessage("Enter your current password before saving.");
      return false;
    }

    if (!trimmedPassword) {
      setErrorMessage("Enter a new password before saving.");
      return false;
    }

    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const result = (await authClient.changePassword({
        currentPassword: trimmedCurrentPassword,
        newPassword: trimmedPassword,
        revokeOtherSessions: true,
      })) as {
        data: { status?: boolean } | null;
        error: unknown;
      };

      if (result.error) {
        setErrorMessage(toDisplayError(result.error, "Unable to update the password."));
        return false;
      }

      setStatusMessage("Password updated.");
      requestRefresh();
      return true;
    } catch (error) {
      setErrorMessage(toDisplayError(error, "Unable to update the password."));
      return false;
    }
  };

  const linkedCredentialAccount = accounts.find((account) => account.providerId === "credential");

  return (
    <div className="space-y-4">
      <DashboardSection
        actions={
          <a
            className={buttonVariants({ size: "sm", variant: "outline" })}
            href={localizeHref("/dashboard")}
          >
            Back to overview
          </a>
        }
        description={`Connected accounts, CLI keys, and agent access for ${displayHandle}.`}
        eyebrow="Dashboard / Settings"
        title="Access controls"
      >
        <div className="space-y-4">
          <SettingsAlerts errorMessage={errorMessage} statusMessage={statusMessage} />
          <SettingsDashboardPanels
            accounts={accounts}
            agentConfiguration={agentConfiguration}
            apiKeyName={apiKeyName}
            apiKeys={apiKeys}
            currentUserEmail={currentUser?.email}
            createdSecret={createdSecret}
            isLoading={isLoading}
            linkedCredentialAccount={linkedCredentialAccount}
            onApiKeyNameChange={setApiKeyName}
            onCreateApiKey={handleCreateApiKey}
            onDeleteApiKey={handleDeleteApiKey}
            onLinkProvider={(provider) => {
              void handleLinkProvider(provider);
            }}
            onSavePassword={handleSetPassword}
            onUnlinkAccount={(account) => {
              void handleUnlinkAccount(account);
            }}
            pendingAction={pendingAction}
          />
        </div>
      </DashboardSection>
    </div>
  );
}
