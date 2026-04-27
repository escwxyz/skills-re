"use client";

import { useState } from "react";
import { TranslateIcon } from "@phosphor-icons/react";
import { getLocaleName, getLocalizedUrl } from "intlayer";
import type { LocalesValues } from "intlayer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IntlayerProvider, useIntlayer, useLocale } from "react-intlayer";

function LanguageSwitcherInner({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  const content = useIntlayer("language-switcher");

  const { locale, availableLocales, setLocale } = useLocale({
    onLocaleChange: (newLocale: LocalesValues) => {
      // Navigate to the localized URL on locale change
      window.location.href = getLocalizedUrl(window.location.pathname, newLocale);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={`text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors ${className ?? ""}`}
      >
        <TranslateIcon className="size-4 shrink-0" />
        <span>{content.shortLabel}</span>
      </DialogTrigger>

      <DialogContent showCloseButton={false} className="max-w-xs p-0">
        <DialogHeader className="border-rule border-b px-5 py-4">
          <DialogTitle className="text-muted-foreground font-mono text-[10px] tracking-[0.2em] uppercase">
            {content.languages}
          </DialogTitle>
        </DialogHeader>

        <ul>
          {availableLocales.map((lang) => {
            const isActive = lang === locale;
            return (
              <li key={lang} className="border-rule border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => setLocale(lang)}
                  className={`hover:bg-paper-2 flex w-full cursor-pointer items-center justify-between px-5 py-4 font-mono text-[11.5px] tracking-normal normal-case transition-colors ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <span>{getLocaleName(lang)}</span>
                  <span className="text-[10px] tracking-[0.12em] uppercase">
                    {lang}
                    {isActive && (
                      <span className="bg-foreground ml-2 inline-block size-1.5 rounded-full align-middle" />
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

interface Props {
  className?: string;
  locale: LocalesValues;
  withProvider?: boolean;
}

export const LanguageSwitcher = ({ withProvider = true, locale, className }: Props) => {
  if (withProvider) {
    return (
      <IntlayerProvider locale={locale}>
        <LanguageSwitcherInner className={className} />
      </IntlayerProvider>
    );
  }

  return <LanguageSwitcherInner className={className} />;
};
