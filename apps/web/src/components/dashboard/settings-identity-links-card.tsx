// oxlint-disable no-nested-ternary
"use client";

import type { FormEvent } from "react";

import { LinkSimpleIcon, UserCircleIcon } from "@phosphor-icons/react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import { formatDateTime, formatProviderLabel, providerMeta } from "./settings-data";
import type { LinkedAccount, SocialProvider } from "./settings-data";

interface IdentityLinksCardProps {
  accounts: LinkedAccount[];
  currentPassword: string;
  currentUserEmail?: string | null;
  isLoading: boolean;
  linkedCredentialAccount?: LinkedAccount | null;
  newPassword: string;
  onCurrentPasswordChange: (value: string) => void;
  onLinkProvider: (provider: SocialProvider) => void;
  onNewPasswordChange: (value: string) => void;
  onSavePassword: (event: FormEvent<HTMLFormElement>) => void;
  onUnlinkAccount: (account: LinkedAccount) => void;
  pendingAction: string | null;
}

export function IdentityLinksCard({
  accounts,
  currentPassword,
  currentUserEmail,
  isLoading,
  linkedCredentialAccount,
  newPassword,
  onCurrentPasswordChange,
  onLinkProvider,
  onNewPasswordChange,
  onSavePassword,
  onUnlinkAccount,
  pendingAction,
}: IdentityLinksCardProps) {
  const connectedProviderIds = new Set(accounts.map((account) => account.providerId));

  return (
    <Card className="rounded-none border-rule/70 bg-background">
      <CardHeader className="border-b border-rule/60 pb-3">
        <CardDescription className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-text">
          Connected accounts
        </CardDescription>
        <CardTitle className="mt-2 flex items-center gap-2 font-serif text-[1.35rem] leading-none tracking-[-0.03em]">
          <UserCircleIcon className="size-5 text-muted-text" />
          Identity links
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 py-4">
        <p className="text-[13px] leading-[1.6] text-foreground/80">
          Link Google or GitHub to this account. Keep at least one provider attached so you do not
          lock yourself out.
        </p>

        <div className="space-y-3">
          {accounts.length > 0 ? (
            accounts.map((account) => {
              const isLastAccount = accounts.length === 1;
              return (
                <div key={account.id} className="border border-rule/70 bg-paper/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="flex items-center gap-2 font-serif text-[18px] leading-[1.1]">
                        <LinkSimpleIcon className="size-4 text-muted-text" />
                        {formatProviderLabel(account.providerId)}
                      </p>
                      <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-text">
                        {account.accountId}
                      </p>
                      <p className="text-[12px] leading-normal text-foreground/70">
                        Linked {formatDateTime(account.createdAt)}
                      </p>
                      {account.scopes.length > 0 ? (
                        <p className="text-[12px] leading-normal text-foreground/70">
                          Scopes: {account.scopes.join(", ")}
                        </p>
                      ) : null}
                    </div>

                    <button
                      className={buttonVariants({
                        size: "sm",
                        variant: "outline",
                      })}
                      disabled={isLastAccount || pendingAction === `unlink-${account.id}`}
                      onClick={() => {
                        void onUnlinkAccount(account);
                      }}
                      type="button"
                    >
                      {pendingAction === `unlink-${account.id}` ? "Removing..." : "Unlink"}
                    </button>
                  </div>

                  {isLastAccount ? (
                    <p className="mt-3 text-[12px] leading-normal text-muted-text">
                      This is the last connected account, so unlinking is disabled until another
                      provider is linked.
                    </p>
                  ) : null}

                  {account.providerId === "credential" ? (
                    <p className="mt-3 text-[12px] leading-normal text-muted-text">
                      Email password login is active for this account.
                    </p>
                  ) : null}
                </div>
              );
            })
          ) : isLoading ? (
            <p className="text-[13px] leading-normal text-muted-text">Loading linked accounts...</p>
          ) : (
            <p className="text-[13px] leading-normal text-muted-text">No linked accounts found.</p>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-text">
            Link another provider
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
                  disabled={isConnected || pendingAction === `link-${provider}`}
                  onClick={() => {
                    void onLinkProvider(provider);
                  }}
                  type="button"
                >
                  {pendingAction === `link-${provider}`
                    ? `Connecting ${providerMeta[provider].label}...`
                    : isConnected
                      ? `${providerMeta[provider].label} connected`
                      : `Link ${providerMeta[provider].label}`}
                </button>
              );
            })}
          </div>
        </div>

        {linkedCredentialAccount ? (
          <>
            <Separator />
            <form className="space-y-3" onSubmit={onSavePassword}>
              <div className="space-y-1">
                <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-text">
                  Password access
                </p>
                <p className="text-[13px] leading-normal text-foreground/70">
                  Update the password backing the email credential login.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  autoComplete="current-password"
                  className="h-10"
                  onChange={(event) => {
                    onCurrentPasswordChange(event.target.value);
                  }}
                  placeholder="Current password"
                  type="password"
                  value={currentPassword}
                />
                <Input
                  autoComplete="new-password"
                  className="h-10"
                  onChange={(event) => {
                    onNewPasswordChange(event.target.value);
                  }}
                  placeholder="New password"
                  type="password"
                  value={newPassword}
                />
              </div>
              <button className={buttonVariants({ size: "sm" })} type="submit">
                {pendingAction === "set-password" ? "Saving..." : "Save password"}
              </button>
            </form>
          </>
        ) : currentUserEmail ? (
          <div className="border border-rule/70 bg-paper/70 p-4 text-[13px] leading-[1.6] text-foreground/75">
            Email login is not linked yet. Use a social account or connect a credential-based login
            first.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
