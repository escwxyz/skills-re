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
import { getDictionary, useIntlayerContext, IntlayerProvider } from "react-intlayer";
import cookieConsentContent from "./cookie-consent.content";
import type { LocalesValues } from "intlayer";

function CookieConsentInner() {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<CookieConsentChoice>("essential");

  const { locale } = useIntlayerContext() ?? {};
  const content = getDictionary(cookieConsentContent, locale);

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
        aria-label="Toggle cookie preferences"
        aria-expanded={open}
        className="h-6 cursor-pointer px-2 font-mono text-[10px] tracking-[0.12em] uppercase"
        onClick={() => setOpen((current) => !current)}
        size="xs"
        variant="outline"
      >
        {content.cookie}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
              {content.preferences}
            </DialogTitle>
            <DialogDescription>{content.description}</DialogDescription>
          </DialogHeader>

          <div className="text-ink-2 space-y-3 text-xs leading-relaxed">
            <div className="border-rule bg-paper-2 border px-3 py-2">
              <div className="text-muted-foreground font-mono text-[10px] tracking-[0.14em] uppercase">
                Current choice
              </div>
              <div className="text-ink mt-1 font-mono text-[11px] tracking-[0.12em] uppercase">
                {choice === "all" ? "All cookies allowed" : "Essential only"}
              </div>
            </div>

            <p>
              Changing this preference updates the consent cookie in your browser. You can return
              here any time to revise it.
            </p>
          </div>

          <DialogFooter className="mt-1" showCloseButton={false}>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                className="w-full sm:w-auto"
                onClick={() => updateChoice("essential")}
                type="button"
                variant="outline"
              >
                Essential only
              </Button>
              <Button
                className="w-full sm:w-auto"
                onClick={() => updateChoice("all")}
                type="button"
              >
                Accept all
              </Button>
            </div>
          </DialogFooter>

          <div className="border-rule text-muted-foreground flex items-center justify-between border-t pt-3 font-mono text-[10px] tracking-[0.14em] uppercase">
            <a href="/cookies" className="hover:text-ink">
              Cookie policy
            </a>
            <button type="button" onClick={resetConsent} className="hover:text-ink">
              Reset
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const CookieConsent = ({ locale }: { locale: LocalesValues }) => (
  <IntlayerProvider locale={locale}>
    <CookieConsentInner />
  </IntlayerProvider>
);
