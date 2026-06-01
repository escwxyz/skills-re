// oxlint-disable no-nested-ternary
import { useState } from "react";

import { KeyIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAppForm } from "@/hooks/form-hook";
import { authClient } from "@/lib/auth-client";
import { m } from "@/paraglide/messages";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel, Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";

interface ApiKeyItem {
  id: string;
  name?: string | null;
  prefix?: string | null;
  start?: string | null;
  enabled?: boolean;
  createdAt?: Date | number | null;
  lastRequest?: Date | number | null;
  requestCount?: number;
  remaining?: number | null;
}

const API_KEYS_QUERY_KEY = ["api-keys"] as const;

export function ApiKeysCard() {
  const queryClient = useQueryClient();
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: API_KEYS_QUERY_KEY,
    queryFn: async () => {
      const result = await authClient.apiKey.list({
        query: { limit: 20, sortBy: "createdAt", sortDirection: "desc" },
      });
      if (result.error) {
        throw result.error;
      }
      return (result.data as { apiKeys: ApiKeyItem[] } | null)?.apiKeys ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string | undefined) => {
      const result = (await authClient.apiKey.create({ name })) as {
        data: { key: string } | null;
        error: unknown;
      };
      if (!result.data?.key) {
        throw result.error ?? new Error("Creation failed.");
      }
      return result.data.key;
    },
    onSuccess: (secret) => {
      setCreatedSecret(secret);
      void queryClient.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const result = (await authClient.apiKey.delete({ keyId })) as {
        data: { success?: boolean } | null;
        error: unknown;
      };
      if (result.error) {
        throw result.error;
      }
    },
    onMutate: (keyId) => setDeletingId(keyId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY }),
    onSettled: () => setDeletingId(null),
  });

  const form = useAppForm({
    defaultValues: { name: "" },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync(value.name.trim() || undefined, {
        onError: () => toast.error("Failed to create API key."),
      });
      form.reset();
    },
  });

  return (
    <Card className="rounded-none border-border/70 bg-background">
      <CardHeader className="border-b border-border/60 pb-3">
        <CardDescription className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
          {m.dashboard_settings_api_eyebrow()}
        </CardDescription>
        <CardTitle className="mt-2 flex items-center gap-2 font-display text-[1.35rem] leading-none tracking-[-0.03em]">
          <KeyIcon className="size-5 text-muted-foreground" />
          {m.dashboard_settings_api_title()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 py-4">
        <p className="text-[13px] leading-[1.6] text-foreground/80">
          {m.dashboard_settings_api_description()}
        </p>

        <form.AppForm>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              void form.handleSubmit();
            }}
            className="space-y-3"
          >
            <form.AppField name="name">
              {(field) => (
                <Field className="space-y-1">
                  <FieldLabel className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
                    {m.dashboard_settings_api_key_label()}
                  </FieldLabel>
                  <Input
                    autoComplete="off"
                    className="h-10"
                    id="api-key-name"
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder={m.dashboard_settings_api_key_placeholder()}
                    value={field.state.value}
                  />
                </Field>
              )}
            </form.AppField>

            <form.Subscribe selector={(s) => s.isSubmitting}>
              {(isSubmitting) => (
                <button
                  className={buttonVariants({ size: "sm" })}
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting
                    ? m.dashboard_settings_api_generating()
                    : m.dashboard_settings_api_generate()}
                </button>
              )}
            </form.Subscribe>
          </Form>
        </form.AppForm>

        {createdSecret ? (
          <div className="border border-amber-500/25 bg-amber-50 p-4 text-[13px] leading-[1.6] text-foreground/80">
            <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-amber-800">
              {m.dashboard_settings_api_copy_once()}
            </p>
            <p className="mt-2">
              <span className="font-medium">{m.dashboard_settings_api_secret()}</span>{" "}
              <code className="break-all rounded-none bg-background px-2 py-1 text-[12px]">
                {createdSecret}
              </code>
            </p>
          </div>
        ) : null}

        <Separator />

        <div className="space-y-3">
          {apiKeys.length > 0 ? (
            apiKeys.map((key) => {
              const isDeleting = deletingId === key.id;
              return (
                <div key={key.id} className="border border-border/70 bg-background/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-display text-[18px] leading-[1.1]">
                        {key.name ?? m.dashboard_settings_api_unnamed_key()}
                      </p>
                      <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
                        {key.prefix && key.start
                          ? `${key.prefix}${key.start}`
                          : (key.start ?? m.dashboard_settings_api_no_prefix())}{" "}
                        ·{" "}
                        {key.enabled
                          ? m.dashboard_settings_api_enabled()
                          : m.dashboard_settings_api_disabled()}
                      </p>
                    </div>

                    <button
                      className={buttonVariants({ size: "sm", variant: "outline" })}
                      disabled={isDeleting}
                      onClick={() => deleteMutation.mutate(key.id)}
                      type="button"
                    >
                      {isDeleting
                        ? m.dashboard_settings_api_revoking()
                        : m.dashboard_settings_api_revoke()}
                    </button>
                  </div>

                  <p className="mt-3 text-[12px] leading-normal text-muted-foreground">
                    {m.dashboard_settings_api_requests_window({ count: key.requestCount ?? 0 })}
                    {key.remaining === null || key.remaining === undefined
                      ? ""
                      : ` · ${m.dashboard_settings_api_remaining({ count: key.remaining })}`}
                  </p>
                </div>
              );
            })
          ) : isLoading ? (
            <p className="text-[13px] leading-normal text-muted-foreground">
              {m.dashboard_settings_api_loading()}
            </p>
          ) : (
            <p className="text-[13px] leading-normal text-muted-foreground">
              {m.dashboard_settings_api_empty()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
