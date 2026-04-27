/** biome-ignore-all lint/style/noNestedTernary: <ignore> */
"use client";

import { useStore } from "@nanostores/react";
import { useState } from "react";
import { SignInIcon } from "@phosphor-icons/react";
import { IntlayerProvider, useIntlayer } from "react-intlayer";

import { isLoginDialogOpenAtom, loginDialogOnlyGithubAtom } from "@/stores/app";
import { authClient } from "@/lib/auth-client";

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
} from "@/components/ui/dialog";
import type { LocalesValues } from "intlayer";

interface LoginDialogFooterProps {
  onLinkClick: () => void;
}

const LoginDialogFooter = ({ onLinkClick }: LoginDialogFooterProps) => {
  const content = useIntlayer("login-dialog");
  return (
    <div className="border-border/50 mt-6 border-t pt-4 text-center">
      <p className="text-muted-foreground text-[11px]">
        {content.bySigningInYouAgreeToOur}{" "}
        <a className="underline" onClick={onLinkClick} href="/terms">
          {content.terms}
        </a>{" "}
        {content.and}{" "}
        <a className="underline" onClick={onLinkClick} href="/privacy">
          {content.privacyPolicy}
        </a>
        .
      </p>
    </div>
  );
};

interface LoginDialogProps {
  onOpenChange?: (open: boolean) => void;
  callbackUrl?: string;
  onlyGitHub?: boolean;
  locale: LocalesValues;
}

const LoginDialogContent = ({
  onOpenChange,
  callbackUrl,
  onlyGitHub,
}: Omit<LoginDialogProps, "locale">) => {
  const content = useIntlayer("login-dialog");
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
            <span className="hidden md:block">{content.signIn}</span>
          </Button>
        }
      />
      <DialogContent className="p-6 sm:max-w-md">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-foreground text-center text-base font-semibold">
            {content.signInToContinue}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-center">
            {resolvedOnlyGitHub ? content.continueWithGithubToVerify : content.chooseAProvider}
          </DialogDescription>
        </DialogHeader>

        {view === "options" ? (
          <SocialAuthButtons
            onEmail={resolvedOnlyGitHub ? undefined : () => setView("email")}
            onlyGitHub={resolvedOnlyGitHub}
            onSocial={handleLogin}
          />
        ) : (
          <EmailOtpForm onBack={resetEmailFlow} />
        )}

        <LoginDialogFooter onLinkClick={closeDialog} />
      </DialogContent>
    </Dialog>
  );
};

export const LoginDialog = ({ locale, ...props }: LoginDialogProps) => (
  <IntlayerProvider locale={locale}>
    <LoginDialogContent {...props} />
  </IntlayerProvider>
);
