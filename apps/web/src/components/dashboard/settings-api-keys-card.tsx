// oxlint-disable no-nested-ternary
"use client";

import type { FormEvent } from "react";

import { KeyIcon } from "@phosphor-icons/react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import { formatDateTime } from "./settings-data";
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
          API keys
        </CardDescription>
        <CardTitle className="mt-2 flex items-center gap-2 font-serif text-[1.35rem] leading-[1] tracking-[-0.03em]">
          <KeyIcon className="size-5 text-muted-text" />
          CLI access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 py-4">
        <p className="text-[13px] leading-[1.6] text-foreground/80">
          Generate API keys for the CLI or any other programmatic client. The secret is only shown
          once at creation time.
        </p>

        <form className="space-y-3" onSubmit={onCreateApiKey}>
          <div className="space-y-1">
            <label
              className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-text"
              htmlFor="api-key-name"
            >
              Key label
            </label>
            <Input
              autoComplete="off"
              className="h-10"
              id="api-key-name"
              onChange={(event) => {
                onApiKeyNameChange(event.target.value);
              }}
              placeholder="CLI access"
              value={apiKeyName}
            />
          </div>

          <button
            className={buttonVariants({ size: "sm" })}
            disabled={pendingAction === "create-api-key"}
            type="submit"
          >
            {pendingAction === "create-api-key" ? "Generating..." : "Generate API key"}
          </button>
        </form>

        {createdSecret ? (
          <div className="border border-amber-500/25 bg-amber-50 p-4 text-[13px] leading-[1.6] text-foreground/80">
            <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-amber-800">
              Copy once
            </p>
            <p className="mt-2">
              <span className="font-medium">Secret:</span>{" "}
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
                        {key.name ?? "Unnamed key"}
                      </p>
                      <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-text">
                        {key.prefix && key.start
                          ? `${key.prefix}${key.start}`
                          : (key.start ?? "No prefix")}{" "}
                        · {key.enabled ? "Enabled" : "Disabled"}
                      </p>
                      <p className="text-[12px] leading-normal text-foreground/70">
                        Created {formatDateTime(key.createdAt)}
                      </p>
                      <p className="text-[12px] leading-normal text-foreground/70">
                        Last used {formatDateTime(key.lastRequest)}
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
                      {isDeleting ? "Revoking..." : "Revoke"}
                    </button>
                  </div>

                  <p className="mt-3 text-[12px] leading-normal text-muted-text">
                    Requests this window: {key.requestCount}
                    {key.remaining === null ? "" : ` · Remaining: ${key.remaining}`}
                  </p>
                </div>
              );
            })
          ) : isLoading ? (
            <p className="text-[13px] leading-normal text-muted-text">Loading API keys...</p>
          ) : (
            <p className="text-[13px] leading-normal text-muted-text">
              No API keys have been created yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
