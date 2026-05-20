/** biome-ignore-all lint/style/noNestedTernary: <ignore> */
import { useState } from "react";
import { useGoogleAnalytics } from "tanstack-router-ga4";

import { authClient } from "@/lib/auth-client";
import { createAuthRedirectUrl } from "@/utils/create-auth-redirect-url";

import { EmailOtpForm } from "@/components/email-otp-form";
import { SocialAuthButtons } from "@/components/social-auth-buttons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { m } from "@/paraglide/messages";
import { localizeHref } from "@/paraglide/runtime";

export interface AuthLoginPanelProps {
  callbackUrl?: string;
  defaultCallbackUrl?: string;
  description?: string | null;
  intent?: "continue" | "dashboard";
  onlyGitHub?: boolean;
  onFooterLinkClick?: () => void;
  title?: string | null;
}

const AuthLoginFooter = ({ onLinkClick }: { onLinkClick: () => void }) => (
  <div className="border-border/50 mt-6 border-t pt-4 text-center">
    <p className="text-muted-foreground text-[11px]">
      {m.login_dialog_by_signing_in_you_agree_to_our()}{" "}
      <a className="underline" onClick={onLinkClick} href={localizeHref("/terms")}>
        {m.login_dialog_terms()}
      </a>{" "}
      {m.login_dialog_and()}{" "}
      <a className="underline" onClick={onLinkClick} href={localizeHref("/privacy")}>
        {m.login_dialog_privacy_policy()}
      </a>
      .
    </p>
  </div>
);

export const AuthLoginPanel = ({
  callbackUrl,
  defaultCallbackUrl = "/dashboard",
  description,
  intent,
  onlyGitHub = false,
  onFooterLinkClick,
  title,
}: AuthLoginPanelProps) => {
  const [view, setView] = useState<"options" | "email">("options");
  const ga = useGoogleAnalytics();

  const resolvedCallbackUrl =
    callbackUrl ??
    defaultCallbackUrl ??
    (typeof window === "undefined"
      ? "/dashboard"
      : `${window.location.pathname}${window.location.search}${window.location.hash}`);

  const handleLogin = async (provider: "github" | "google") => {
    ga.event("login_attempt", {
      intent,
      method: provider,
    });

    await authClient.signIn.social({
      callbackURL: createAuthRedirectUrl(resolvedCallbackUrl),
      provider,
    });
  };

  const resetEmailFlow = () => {
    setView("options");
  };

  return (
    <Card className="w-full max-w-md rounded-none border-border/70 bg-background shadow-none">
      <CardHeader className="mb-1 border-b border-border/60 pb-5">
        <CardTitle className="text-foreground text-center text-base font-semibold">
          {title ?? m.login_dialog_sign_in_to_continue()}
        </CardTitle>
        <CardDescription className="text-muted-foreground text-center">
          {description ??
            (onlyGitHub
              ? m.login_dialog_continue_with_github_to_verify()
              : m.login_dialog_choose_a_provider())}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-2">
        {view === "options" ? (
          <SocialAuthButtons
            onEmail={onlyGitHub ? undefined : () => setView("email")}
            onlyGitHub={onlyGitHub}
            onSocial={handleLogin}
          />
        ) : (
          <EmailOtpForm callbackUrl={resolvedCallbackUrl} onBack={resetEmailFlow} />
        )}

        <AuthLoginFooter onLinkClick={() => onFooterLinkClick?.()} />
      </CardContent>
    </Card>
  );
};
