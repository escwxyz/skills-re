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

const LANGUAGES = [
  { code: "en", label: "English", short: "EN" },
  { code: "de", label: "Deutsch", short: "DE" },
  { code: "zh-hans", label: "中文（简体）", short: "中文" },
] as const;

type LanguageCode = (typeof LANGUAGES)[number]["code"];

function getStoredLocale(): LanguageCode {
  if (typeof localStorage === "undefined") return "en";
  return (localStorage.getItem("locale") as LanguageCode) ?? "en";
}

interface Props {
  className?: string;
}

export function LanguageSwitcher({ className }: Props) {
  const [locale, setLocale] = useState<LanguageCode>(getStoredLocale);
  const [open, setOpen] = useState(false);

  const current = LANGUAGES.find((l) => l.code === locale);

  const select = (code: LanguageCode) => {
    setLocale(code);
    localStorage.setItem("locale", code);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={`flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase cursor-pointer text-muted-foreground hover:text-foreground transition-colors ${className ?? ""}`}
      >
        <TranslateIcon className="size-4 shrink-0" />
        {current?.short}
      </DialogTrigger>

      <DialogContent showCloseButton={false} className="p-0 max-w-xs">
        <DialogHeader className="border-b border-rule px-5 py-4">
          <DialogTitle className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            Language
          </DialogTitle>
        </DialogHeader>

        <ul>
          {LANGUAGES.map((lang) => {
            const isActive = lang.code === locale;
            return (
              <li key={lang.code} className="border-b border-rule last:border-b-0">
                <button
                  type="button"
                  onClick={() => select(lang.code)}
                  className={`flex w-full items-center justify-between px-5 py-4 font-mono text-[11.5px] tracking-normal normal-case cursor-pointer transition-colors hover:bg-paper-2 ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <span>{lang.label}</span>
                  <span className="text-[10px] tracking-[0.12em] uppercase">
                    {lang.short}
                    {isActive && (
                      <span className="ml-2 inline-block size-1.5 rounded-full bg-foreground align-middle" />
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
