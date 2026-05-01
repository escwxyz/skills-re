"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { localizeHref } from "@/paraglide/runtime";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { CurrentUser } from "./dashboard/shared";

interface Props {
  currentUser?: CurrentUser | null;
  userCode?: string;
}

export function DeviceApproval({ currentUser, userCode = "" }: Props) {
  const [code, setCode] = useState(userCode);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleApprove = async () => {
    if (!code.trim()) {
      setMessage("Enter a device code first.");
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      await authClient.device.approve({
        userCode: code.trim(),
      });
      window.location.href = localizeHref("/dashboard/settings");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to approve the device.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeny = async () => {
    if (!code.trim()) {
      setMessage("Enter a device code first.");
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      await authClient.device.deny({
        userCode: code.trim(),
      });
      window.location.href = localizeHref("/dashboard/settings");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to deny the device.");
    } finally {
      setIsProcessing(false);
    }
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

          <div className="space-y-2">
            <label className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-text">
              User code
            </label>
            <Input
              className="h-10"
              onChange={(event) => setCode(event.target.value)}
              placeholder="ABCD-1234"
              value={code}
            />
          </div>

          {message ? <p className="text-[13px] text-destructive">{message}</p> : null}

          <div className="flex flex-wrap gap-2">
            <button
              className={buttonVariants({ size: "sm" })}
              disabled={isProcessing || !currentUser}
              onClick={() => void handleApprove()}
              type="button"
            >
              {isProcessing ? "Processing..." : "Approve"}
            </button>
            <button
              className={buttonVariants({ size: "sm", variant: "outline" })}
              disabled={isProcessing || !currentUser}
              onClick={() => void handleDeny()}
              type="button"
            >
              Deny
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
