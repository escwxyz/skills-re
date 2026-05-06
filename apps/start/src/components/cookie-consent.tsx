"use client";

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
import { m } from "@/paraglide/messages";
import { localizeHref } from "@/paraglide/runtime";

function CookieConsentInner() {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<CookieConsentChoice>("essential");

  useEffect(() => {
    const run = async () => {
      const saved = await readCookieConsent();
      setChoice(saved);
    };
    run();
  }, []);

  const updateChoice = async (nextChoice: CookieConsentChoice) => {
    await writeCookieConsent(nextChoice);
    setChoice(nextChoice);
    setOpen(false);
  };

  const resetConsent = async () => {
    await clearCookieConsent();
    setChoice("essential");
  };

  return (
    <>
      <Button
        aria-label={m.cookie_consent_toggle_aria_label()}
        aria-expanded={open}
        className="h-6 cursor-pointer px-2 font-mono text-[10px] tracking-[0.12em] uppercase"
        onClick={() => setOpen((current) => !current)}
        size="xs"
        variant="outline"
      >
        {m.cookie_consent_toggle_aria_label()}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
              {m.cookie_consent_preferences()}
            </DialogTitle>
            <DialogDescription>{m.cookie_consent_description()}</DialogDescription>
          </DialogHeader>

          <div className="text-ink-2 space-y-3 text-xs leading-relaxed">
            <div className="border-rule bg-paper-2 border px-3 py-2">
              <div className="text-muted-foreground font-mono text-[10px] tracking-[0.14em] uppercase">
                {m.cookie_consent_current_choice()}
              </div>
              <div className="text-ink mt-1 font-mono text-[11px] tracking-[0.12em] uppercase">
                {choice === "all"
                  ? m.cookie_consent_all_cookies_allowed()
                  : m.cookie_consent_essential_only()}
              </div>
            </div>

            <p>{m.cookie_consent_change_note()}</p>
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

          <div className="border-rule text-muted-foreground flex items-center justify-between border-t pt-3 font-mono text-[10px] tracking-[0.14em] uppercase">
            <a href={localizeHref("/cookies")} className="hover:text-ink">
              {m.cookie_consent_policy()}
            </a>
            <button type="button" onClick={resetConsent} className="hover:text-ink">
              {m.cookie_consent_reset()}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const CookieConsent = () => <CookieConsentInner />;
