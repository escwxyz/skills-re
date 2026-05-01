// oxlint-disable no-nested-ternary
"use client";

import type { FormEvent } from "react";

import { KeyIcon } from "@phosphor-icons/react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { m } from "@/paraglide/messages";

import { formatDateTime } from "@/lib/utils";
import type { ApiKeyItem } from "./settings-data";

interface ApiKeysCardProps {
  apiKeyName: string;
  apiKeys: ApiKeyItem[];
  createdSecret: string | null;
  isLoading: boolean;
  onApiKeyNameChange: (value: string) => void;
  onCreateApiKey: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteApiKey: (keyId: string) => void;
  pendingAction: string | null;
}

export function ApiKeysCard({
  apiKeyName,
  apiKeys,
  createdSecret,
  isLoading,
  onApiKeyNameChange,
  onCreateApiKey,
  onDeleteApiKey,
  pendingAction,
}: ApiKeysCardProps) {
  return (
    <Card className="rounded-none border-rule/70 bg-background">
      <CardHeader className="border-b border-rule/60 pb-3">
        <CardDescription className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-text">
          {m.dashboard_settings_api_eyebrow()}
        </CardDescription>
        <CardTitle className="mt-2 flex items-center gap-2 font-serif text-[1.35rem] leading-none tracking-[-0.03em]">
          <KeyIcon className="size-5 text-muted-text" />
          {m.dashboard_settings_api_title()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 py-4">
        <p className="text-[13px] leading-[1.6] text-foreground/80">
          {m.dashboard_settings_api_description()}
        </p>

        <form className="space-y-3" onSubmit={onCreateApiKey}>
          <div className="space-y-1">
            <label
              className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-text"
              htmlFor="api-key-name"
            >
              {m.dashboard_settings_api_key_label()}
            </label>
            <Input
              autoComplete="off"
              className="h-10"
              id="api-key-name"
              onChange={(event) => {
                onApiKeyNameChange(event.target.value);
              }}
              placeholder={m.dashboard_settings_api_key_placeholder()}
              value={apiKeyName}
            />
          </div>

          <button
            className={buttonVariants({ size: "sm" })}
            disabled={pendingAction === "create-api-key"}
            type="submit"
          >
            {pendingAction === "create-api-key"
              ? m.dashboard_settings_api_generating()
              : m.dashboard_settings_api_generate()}
          </button>
        </form>

        {createdSecret ? (
          <div className="border border-amber-500/25 bg-amber-50 p-4 text-[13px] leading-[1.6] text-foreground/80">
            <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-amber-800">
              {m.dashboard_settings_api_copy_once()}
            </p>
            <p className="mt-2">
              <span className="font-medium">{m.dashboard_settings_api_secret()}</span>{" "}
              <code className="break-all rounded bg-background px-2 py-1 text-[12px]">
                {createdSecret}
              </code>
            </p>
          </div>
        ) : null}

        <Separator />

        <div className="space-y-3">
          {apiKeys.length > 0 ? (
            apiKeys.map((key) => {
              const isDeleting = pendingAction === `delete-api-key-${key.id}`;

              return (
                <div key={key.id} className="border border-rule/70 bg-paper/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-serif text-[18px] leading-[1.1]">
                        {key.name ?? m.dashboard_settings_api_unnamed_key()}
                      </p>
                      <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-text">
                        {key.prefix && key.start
                          ? `${key.prefix}${key.start}`
                          : (key.start ?? m.dashboard_settings_api_no_prefix())}{" "}
                        ·{" "}
                        {key.enabled
                          ? m.dashboard_settings_api_enabled()
                          : m.dashboard_settings_api_disabled()}
                      </p>
                      <p className="text-[12px] leading-normal text-foreground/70">
                        {m.dashboard_settings_api_created({ date: formatDateTime(key.createdAt) })}
                      </p>
                      <p className="text-[12px] leading-normal text-foreground/70">
                        {m.dashboard_settings_api_last_used({
                          date: formatDateTime(key.lastRequest),
                        })}
                      </p>
                    </div>

                    <button
                      className={buttonVariants({
                        size: "sm",
                        variant: "outline",
                      })}
                      disabled={isDeleting}
                      onClick={() => {
                        void onDeleteApiKey(key.id);
                      }}
                      type="button"
                    >
                      {isDeleting
                        ? m.dashboard_settings_api_revoking()
                        : m.dashboard_settings_api_revoke()}
                    </button>
                  </div>

                  <p className="mt-3 text-[12px] leading-normal text-muted-text">
                    {m.dashboard_settings_api_requests_window({ count: key.requestCount })}
                    {key.remaining === null
                      ? ""
                      : ` · ${m.dashboard_settings_api_remaining({ count: key.remaining })}`}
                  </p>
                </div>
              );
            })
          ) : isLoading ? (
            <p className="text-[13px] leading-normal text-muted-text">
              {m.dashboard_settings_api_loading()}
            </p>
          ) : (
            <p className="text-[13px] leading-normal text-muted-text">
              {m.dashboard_settings_api_empty()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
