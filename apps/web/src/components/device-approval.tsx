"use client";

import { useRef, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { useAppForm } from "@/hooks/form-hook";
import { localizeHref } from "@/paraglide/runtime";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import type { CurrentUser } from "./dashboard/shared";

interface Props {
  currentUser?: CurrentUser | null;
  userCode?: string;
}

export function DeviceApproval({ currentUser, userCode = "" }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"approve" | "deny" | null>(null);
  const actionRef = useRef<"approve" | "deny">("approve");

  const form = useAppForm({
    defaultValues: { userCode: userCode.replaceAll("-", "") },
    onSubmit: async ({ value }) => {
      const code = value.userCode.trim();
      const action = actionRef.current;
      setPendingAction(action);
      setMessage(null);

      try {
        // oxlint-disable-next-line unicorn/prefer-ternary
        if (action === "approve") {
          await authClient.device.approve({ userCode: code });
        } else {
          await authClient.device.deny({ userCode: code });
        }
        window.location.href = localizeHref("/dashboard/settings");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : `Failed to ${action} the device.`);
      } finally {
        setPendingAction(null);
      }
    },
  });

  const handleAction = (action: "approve" | "deny") => {
    actionRef.current = action;
    void form.handleSubmit();
  };

  return (
    <div className="flex min-h-[calc(100vh-var(--header-height))] items-center justify-center px-6 py-12">
      <Card className="w-full max-w-xl rounded-none border-rule/70 bg-background">
        <CardHeader className="border-b border-rule/60">
          <CardDescription className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-text">
            Device approval
          </CardDescription>
          <CardTitle className="mt-2 font-serif text-[clamp(1.8rem,2.5vw,2.6rem)] leading-[0.96] tracking-[-0.03em]">
            Approve agent access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 py-4">
          <p className="text-[13px] leading-[1.6] text-foreground/80">
            {currentUser
              ? "Authorize the requesting device so it can exchange the approval for scoped agent tokens."
              : "Sign in first, then return here to approve the device."}
          </p>

          <form.AppForm>
            <form.AppField
              name="userCode"
              validators={{
                onSubmit: ({ value }) => (value.trim() ? undefined : "Enter a device code first."),
              }}
            >
              {(field) => (
                <Field className="space-y-2">
                  <FieldLabel className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-text">
                    User code
                  </FieldLabel>
                  <InputOTP maxLength={8} value={field.state.value} onChange={field.handleChange}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                      <InputOTPSlot index={6} />
                      <InputOTPSlot index={7} />
                    </InputOTPGroup>
                  </InputOTP>
                  <FieldError />
                </Field>
              )}
            </form.AppField>
          </form.AppForm>

          {message ? <p className="text-[13px] text-destructive">{message}</p> : null}

          <div className="flex flex-wrap gap-2">
            <button
              className={buttonVariants({ size: "sm" })}
              disabled={pendingAction !== null || !currentUser}
              onClick={() => handleAction("approve")}
              type="button"
            >
              {pendingAction === "approve" ? "Approving..." : "Approve"}
            </button>
            <button
              className={buttonVariants({ size: "sm", variant: "outline" })}
              disabled={pendingAction !== null || !currentUser}
              onClick={() => handleAction("deny")}
              type="button"
            >
              {pendingAction === "deny" ? "Denying..." : "Deny"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
