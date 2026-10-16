import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { clearCookieConsent, readCookieConsent, writeCookieConsent } from "@/lib/cookie-consent";
import type { CookieConsentChoice } from "@/lib/cookie-consent";
import {
  clearCookiePreferences,
  clearCookieSync,
  getCookiePreferences,
  persistCookiePreferences,
} from "@/lib/cookies";
import { APP_LOCALE_COOKIE_NAME, APP_THEME_COOKIE_NAME } from "@/lib/consent-cookie-names";
import { authClient } from "@/lib/auth-client";
import { m } from "@/paraglide/messages";
import { getLocale, localizeHref, setLocale } from "@/paraglide/runtime";
import { CookieIcon } from "@phosphor-icons/react";

interface CookieRowProps {
  name: string;
  description: string;
}

const CookieRow = ({ name, description }: CookieRowProps) => (
  <div className="flex items-start gap-3 py-1.5">
    <code className="text-foreground shrink-0 font-mono text-[10px] tracking-tight">{name}</code>
    <span className="text-muted-foreground text-[11px] leading-tight">{description}</span>
  </div>
);

interface CookieSectionProps {
  title: string;
  badge: string;
  badgeActive?: boolean;
  children: React.ReactNode;
}

const CookieSection = ({ title, badge, badgeActive, children }: CookieSectionProps) => (
  <div className="border-border border">
    <div className="border-border flex items-center justify-between border-b px-3 py-1.5">
      <span className="font-mono text-[10px] tracking-[0.14em] uppercase">{title}</span>
      <span
        className={`font-mono text-[9px] tracking-[0.12em] uppercase ${badgeActive ? "text-foreground" : "text-muted-foreground"}`}
      >
        {badge}
      </span>
    </div>
    <div className="divide-border divide-y px-3">{children}</div>
  </div>
);

export const CookieConsent = () => {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<CookieConsentChoice>("all");

  useEffect(() => {
    const run = async () => {
      const preferences = await getCookiePreferences();
      const savedConsent = await readCookieConsent();

      if (preferences === null) {
        if (savedConsent === "all") {
          persistCookiePreferences({ analytics: true, functional: true });
          setChoice("all");
          return;
        }

        setTimeout(() => setOpen(true), 3000);
        return;
      }

      setChoice(savedConsent);
    };
    run();
  }, []);

  const updateChoice = async (nextChoice: CookieConsentChoice) => {
    await writeCookieConsent(nextChoice);
    persistCookiePreferences({
      analytics: nextChoice === "all",
      functional: nextChoice === "all",
    });

    if (nextChoice === "all") {
      setLocale(getLocale(), { reload: false });
    } else {
      clearCookieSync(APP_LOCALE_COOKIE_NAME);
      clearCookieSync(APP_THEME_COOKIE_NAME);
      await authClient.clearLastUsedLoginMethod();
    }

    setChoice(nextChoice);
    setOpen(false);
  };

  const resetConsent = async () => {
    await clearCookieConsent();
    await clearCookiePreferences();
    clearCookieSync(APP_LOCALE_COOKIE_NAME);
    clearCookieSync(APP_THEME_COOKIE_NAME);
    authClient.clearLastUsedLoginMethod();
    setChoice("essential");
  };

  const analyticsEnabled = choice === "all";
  const functionalEnabled = choice === "all";

  return (
    <>
      <Button
        aria-label={m.cookie_consent_toggle_aria_label()}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        variant="ghost"
      >
        <CookieIcon size={16} />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
              {m.cookie_consent_preferences()}
            </DialogTitle>
            <DialogDescription>{m.cookie_consent_description()}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <CookieSection
              title={m.cookie_consent_section_essential()}
              badge={m.cookie_consent_always_active()}
              badgeActive
            >
              <CookieRow
                name={m.cookie_consent_cookie_session_name()}
                description={m.cookie_consent_cookie_session_desc()}
              />
              <CookieRow
                name={m.cookie_consent_cookie_consent_name()}
                description={m.cookie_consent_cookie_consent_desc()}
              />
            </CookieSection>

            <CookieSection
              title={m.cookie_consent_section_functional()}
              badge={functionalEnabled ? m.cookie_consent_on() : m.cookie_consent_off()}
              badgeActive={functionalEnabled}
            >
              <CookieRow
                name={m.cookie_consent_cookie_locale_name()}
                description={m.cookie_consent_cookie_locale_desc()}
              />
              <CookieRow
                name={m.cookie_consent_cookie_theme_name()}
                description={m.cookie_consent_cookie_theme_desc()}
              />
              <CookieRow
                name={m.cookie_consent_cookie_login_method_name()}
                description={m.cookie_consent_cookie_login_method_desc()}
              />
            </CookieSection>

            <CookieSection
              title={m.cookie_consent_section_analytics()}
              badge={analyticsEnabled ? m.cookie_consent_on() : m.cookie_consent_off()}
              badgeActive={analyticsEnabled}
            >
              <CookieRow
                name={m.cookie_consent_cookie_clarity_name()}
                description={m.cookie_consent_cookie_clarity_desc()}
              />
              <CookieRow
                name={m.cookie_consent_cookie_ga_name()}
                description={m.cookie_consent_cookie_ga_desc()}
              />
            </CookieSection>
          </div>

          <DialogFooter className="mt-1" showCloseButton={false}>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                className="w-full sm:w-auto"
                onClick={() => updateChoice("essential")}
                type="button"
                variant="outline"
              >
                {m.cookie_consent_essential_only_button()}
              </Button>
              <Button
                className="w-full sm:w-auto"
                onClick={() => updateChoice("all")}
                type="button"
              >
                {m.cookie_consent_accept_all_button()}
              </Button>
            </div>
          </DialogFooter>

          <div className="border-border text-muted-foreground flex items-center justify-between border-t pt-3 font-mono text-[10px] tracking-[0.14em] uppercase">
            <a href={localizeHref("/cookies")} className="hover:text-foreground">
              {m.cookie_consent_policy()}
            </a>
            <button type="button" onClick={resetConsent} className="hover:text-foreground">
              {m.cookie_consent_reset()}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
