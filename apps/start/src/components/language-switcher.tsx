"use client";

import { useState } from "react";
import { TranslateIcon } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { m } from "@/paraglide/messages";
import {
  getLocale,
  localizeHref,
  setLocale,
  locales as availableLocales,
} from "@/paraglide/runtime";

export function LanguageSwitcher({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const currentLocale = getLocale();

  const localeLabelMap = {
    en: m.language_switcher_locale_en(),
    de: m.language_switcher_locale_de(),
    "zh-Hans": m.language_switcher_locale_zh_hans(),
  } as const;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={`text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors ${className ?? ""}`}
      >
        <TranslateIcon className="size-4 shrink-0" />
        <span>{m.language_switcher_short_label()}</span>
      </DialogTrigger>

      <DialogContent showCloseButton={false} className="max-w-xs p-0">
        <DialogHeader className="border-rule border-b px-5 py-4">
          <DialogTitle className="text-muted-foreground font-mono text-[10px] tracking-[0.2em] uppercase">
            {m.language_switcher_languages()}
          </DialogTitle>
        </DialogHeader>

        <ul>
          {availableLocales.map((lang) => {
            const isActive = lang === currentLocale;
            return (
              <li key={lang} className="border-rule border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => {
                    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
                    setLocale(lang, { reload: false });
                    window.location.href = localizeHref(currentUrl, {
                      locale: lang,
                    });
                  }}
                  className={`hover:bg-paper-2 flex w-full cursor-pointer items-center justify-between px-5 py-4 font-mono text-[11.5px] tracking-normal normal-case transition-colors ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <span>{localeLabelMap[lang]}</span>
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
