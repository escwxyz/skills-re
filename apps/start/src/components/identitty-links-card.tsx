// oxlint-disable no-nested-ternary
import { useState } from "react";

import { LinkSimpleIcon, UserCircleIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";

import { useAppForm } from "@/hooks/form-hook";
import { authClient } from "@/lib/auth-client";
import { m } from "@/paraglide/messages";
import { localizeHref } from "@/paraglide/runtime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { createAuthRedirectUrl } from "@/utils/create-auth-redirect-url";

interface LinkedAccount {
  id: string;
  providerId: string;
  accountId: string;
  createdAt?: Date | number | null;
  scopes?: string[];
}

type SocialProvider = "github" | "google";

const providerMeta: Record<SocialProvider, { label: string }> = {
  github: { label: "GitHub" },
  google: { label: "Google" },
};

function formatProviderLabel(providerId: string): string {
  if (providerId === "github") {
    return "GitHub";
  }
  if (providerId === "google") {
    return "Google";
  }
  if (providerId === "credential") {
    return "Email / Password";
  }
  return providerId;
}

const ACCOUNTS_QUERY_KEY = ["linked-accounts"] as const;

export function IdentityLinksCard() {
  const queryClient = useQueryClient();
  const { currentUser } = useRouteContext({ from: "/_authedLayout/dashboard" });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [linkingProvider, setLinkingProvider] = useState<SocialProvider | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ACCOUNTS_QUERY_KEY,
    queryFn: async () => {
      const result = await authClient
        .listAccounts()
        .catch((error: unknown) => ({ data: null, error }));
      if (!result.data) {
        return [] as LinkedAccount[];
      }
      return result.data as LinkedAccount[];
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async (account: LinkedAccount) => {
      if (accounts.length <= 1) {
        throw new Error(m.dashboard_settings_error_keep_at_least_one_account_connected());
      }
      const result = (await authClient.unlinkAccount({
        accountId: account.accountId,
        providerId: account.providerId,
      })) as { data: { status?: boolean } | null; error: unknown };
      if (result.error) {
        throw result.error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : m.dashboard_settings_error_unable_to_unlink_account(),
      );
    },
  });

  const handleLinkProvider = async (provider: SocialProvider) => {
    setLinkingProvider(provider);
    setErrorMessage(null);
    try {
      await authClient.linkSocial({
        callbackURL: createAuthRedirectUrl(localizeHref("/dashboard/settings")),
        provider,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : m.dashboard_settings_error_unable_to_start_account_linking(),
      );
      setLinkingProvider(null);
    }
  };

  const passwordForm = useAppForm({
    defaultValues: { currentPassword: "", newPassword: "" },
    onSubmit: async ({ value, formApi }) => {
      const trimmedCurrentPassword = value.currentPassword.trim();
      const trimmedPassword = value.newPassword.trim();
      if (!trimmedCurrentPassword) {
        setErrorMessage(m.dashboard_settings_error_enter_current_password());
        return;
      }
      if (!trimmedPassword) {
        setErrorMessage(m.dashboard_settings_error_enter_new_password());
        return;
      }
      setErrorMessage(null);
      const result = (await authClient.changePassword({
        currentPassword: trimmedCurrentPassword,
        newPassword: trimmedPassword,
        revokeOtherSessions: true,
      })) as { data: { status?: boolean } | null; error: unknown };
      if (result.error) {
        setErrorMessage(
          result.error instanceof Error
            ? result.error.message
            : m.dashboard_settings_error_unable_to_update_password(),
        );
        return;
      }
      formApi.reset();
    },
  });

  const linkedCredentialAccount = accounts.find((a) => a.providerId === "credential");
  const connectedProviderIds = new Set(accounts.map((a) => a.providerId));

  return (
    <Card className="rounded-none border-border/70 bg-background">
      <CardHeader className="border-b border-border/60 pb-3">
        <CardDescription className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
          {m.dashboard_settings_identity_eyebrow()}
        </CardDescription>
        <CardTitle className="mt-2 flex items-center gap-2 font-display text-[1.35rem] leading-none tracking-[-0.03em]">
          <UserCircleIcon className="size-5 text-muted-foreground" />
          {m.dashboard_settings_identity_title()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 py-4">
        <p className="text-[13px] leading-[1.6] text-foreground/80">
          {m.dashboard_settings_identity_description()}
        </p>

        {errorMessage ? (
          <div className="border border-destructive/30 bg-background px-3 py-2 text-[12px] text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <div className="space-y-3">
          {accounts.length > 0 ? (
            accounts.map((account) => {
              const isLastAccount = accounts.length === 1;
              const isUnlinking =
                unlinkMutation.isPending && unlinkMutation.variables?.id === account.id;
              return (
                <div key={account.id} className="border border-border/70 bg-background/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="flex items-center gap-2 font-display text-[18px] leading-[1.1]">
                        <LinkSimpleIcon className="size-4 text-muted-foreground" />
                        {formatProviderLabel(account.providerId)}
                      </p>
                      <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
                        {account.accountId}
                      </p>
                      {account.scopes && account.scopes.length > 0 ? (
                        <p className="text-[12px] leading-normal text-foreground/70">
                          {m.dashboard_settings_identity_scopes({
                            scopes: account.scopes.join(", "),
                          })}
                        </p>
                      ) : null}
                    </div>

                    <button
                      className={buttonVariants({ size: "sm", variant: "outline" })}
                      disabled={isLastAccount || isUnlinking}
                      onClick={() => {
                        unlinkMutation.mutate(account);
                      }}
                      type="button"
                    >
                      {isUnlinking
                        ? m.dashboard_settings_identity_removing()
                        : m.dashboard_settings_identity_unlink()}
                    </button>
                  </div>

                  {isLastAccount ? (
                    <p className="mt-3 text-[12px] leading-normal text-muted-foreground">
                      {m.dashboard_settings_identity_last_account_note()}
                    </p>
                  ) : null}

                  {account.providerId === "credential" ? (
                    <p className="mt-3 text-[12px] leading-normal text-muted-foreground">
                      {m.dashboard_settings_identity_credential_active()}
                    </p>
                  ) : null}
                </div>
              );
            })
          ) : isLoading ? (
            <p className="text-[13px] leading-normal text-muted-foreground">
              {m.dashboard_settings_identity_loading()}
            </p>
          ) : (
            <p className="text-[13px] leading-normal text-muted-foreground">
              {m.dashboard_settings_identity_empty()}
            </p>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
            {m.dashboard_settings_identity_link_another_provider()}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(providerMeta) as SocialProvider[]).map((provider) => {
              const isConnected = connectedProviderIds.has(provider);
              return (
                <button
                  key={provider}
                  className={buttonVariants({
                    size: "sm",
                    variant: isConnected ? "secondary" : "outline",
                  })}
                  disabled={isConnected || linkingProvider === provider}
                  onClick={() => {
                    void handleLinkProvider(provider);
                  }}
                  type="button"
                >
                  {linkingProvider === provider
                    ? m.dashboard_settings_identity_connecting_provider({
                        provider: providerMeta[provider].label,
                      })
                    : isConnected
                      ? m.dashboard_settings_identity_provider_connected({
                          provider: providerMeta[provider].label,
                        })
                      : m.dashboard_settings_identity_link_provider({
                          provider: providerMeta[provider].label,
                        })}
                </button>
              );
            })}
          </div>
        </div>

        {linkedCredentialAccount ? (
          <>
            <Separator />
            <passwordForm.AppForm>
              <Form
                onSubmit={(e) => {
                  e.preventDefault();
                  void passwordForm.handleSubmit();
                }}
                className="space-y-3"
              >
                <div className="space-y-1">
                  <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
                    {m.dashboard_settings_identity_password_access()}
                  </p>
                  <p className="text-[13px] leading-normal text-foreground/70">
                    {m.dashboard_settings_identity_password_description()}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <passwordForm.AppField name="currentPassword">
                    {(field) => (
                      <Input
                        autoComplete="current-password"
                        className="h-10"
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder={m.dashboard_settings_identity_current_password()}
                        type="password"
                        value={field.state.value}
                      />
                    )}
                  </passwordForm.AppField>
                  <passwordForm.AppField name="newPassword">
                    {(field) => (
                      <Input
                        autoComplete="new-password"
                        className="h-10"
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder={m.dashboard_settings_identity_new_password()}
                        type="password"
                        value={field.state.value}
                      />
                    )}
                  </passwordForm.AppField>
                </div>
                <passwordForm.Subscribe selector={(state) => state.isSubmitting}>
                  {(isSubmitting) => (
                    <button
                      className={buttonVariants({ size: "sm" })}
                      disabled={isSubmitting}
                      type="submit"
                    >
                      {isSubmitting
                        ? m.dashboard_settings_identity_saving()
                        : m.dashboard_settings_identity_save_password()}
                    </button>
                  )}
                </passwordForm.Subscribe>
              </Form>
            </passwordForm.AppForm>
          </>
        ) : currentUser?.email ? (
          <div className="border border-border/70 bg-background/70 p-4 text-[13px] leading-[1.6] text-foreground/75">
            {m.dashboard_settings_identity_email_not_linked()}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
