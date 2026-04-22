/** biome-ignore-all lint/style/noNestedTernary: <ignore> */
"use client";

import { useStore } from "@nanostores/react";
import { useState } from "react";
import { SignInIcon } from "@phosphor-icons/react";

import { isLoginDialogOpenAtom, loginDialogOnlyGithubAtom } from "@/stores/app";
import { authClient } from "@/lib/auth-client";
import { m } from "@/paraglide/messages";

import { EmailOtpForm } from "@/components/email-otp-form";
import { SocialAuthButtons } from "@/components/social-auth-buttons";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

interface LoginDialogFooterProps {
  onLinkClick: () => void;
}

const LoginDialogFooter = ({ onLinkClick }: LoginDialogFooterProps) => (
  <div className="border-border/50 mt-6 border-t pt-4 text-center">
    <p className="text-muted-foreground text-[11px]">
      {m.ui_by_signing_in_you_agree_to_our()}{" "}
      <a className="underline" onClick={onLinkClick} href="/terms">
        {m.ui_terms()}
      </a>{" "}
      {m.ui_and()}{" "}
      <a className="underline" onClick={onLinkClick} href="/privacy">
        {m.ui_privacy_policy()}
      </a>
      .
    </p>
  </div>
);

interface LoginDialogProps {
  onOpenChange?: (open: boolean) => void;
  callbackUrl?: string;
  onlyGitHub?: boolean;
}

export const LoginDialog = ({ onOpenChange, callbackUrl, onlyGitHub }: LoginDialogProps) => {
  const isOpen = useStore(isLoginDialogOpenAtom);
  const isGithubOnlyMode = useStore(loginDialogOnlyGithubAtom);
  const [view, setView] = useState<"options" | "email">("options");
  const resolvedOnlyGitHub = onlyGitHub ?? isGithubOnlyMode;

  const closeDialog = () => {
    isLoginDialogOpenAtom.set(false);
  };

  const handleLogin = async (provider: "github" | "google") => {
    await authClient.signIn.social({
      callbackURL: callbackUrl,
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/dashboard";
        },
      },
      provider,
    });
  };

  const resetEmailFlow = () => {
    setView("options");
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        onOpenChange?.(open);
        isLoginDialogOpenAtom.set(open);
        if (!open) {
          resetEmailFlow();
          loginDialogOnlyGithubAtom.set(false);
        }
      }}
      open={isOpen}
    >
      <DialogTrigger
        render={
          <Button className="text-primary-foreground hover:bg-primary flex cursor-pointer items-center gap-2">
            <SignInIcon />
            <span className="hidden md:block">{m.ui_sign_in()}</span>
          </Button>
        }
      />
      <DialogContent className="p-6 sm:max-w-md">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-foreground text-center text-base font-semibold">
            {m.ui_sign_in_to_continue()}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-center">
            {resolvedOnlyGitHub
              ? m.ui_continue_with_github_to_verify_your_identity()
              : m.ui_choose_a_provider_or_get_a_one_time_code_by_email()}
          </DialogDescription>
        </DialogHeader>

        {view === "options" ? (
          <SocialAuthButtons
            onEmail={resolvedOnlyGitHub ? undefined : () => setView("email")}
            onlyGitHub={resolvedOnlyGitHub}
            onSocial={handleLogin}
          />
        ) : (
          <EmailOtpForm
            // callbackUrl={resolvedCallbackUrl}
            onBack={resetEmailFlow}
          />
        )}

        <LoginDialogFooter onLinkClick={closeDialog} />
      </DialogContent>
    </Dialog>
  );
};
