"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  clearCookieConsent,
  readCookieConsent,
  type CookieConsentChoice,
  writeCookieConsent,
} from "@/lib/cookie-consent"

export function CookieConsent() {
  const [open, setOpen] = useState(false)
  const [choice, setChoice] = useState<CookieConsentChoice>("essential")

  useEffect(() => {
    setChoice(readCookieConsent())
  }, [])

  const updateChoice = (nextChoice: CookieConsentChoice) => {
    writeCookieConsent(nextChoice)
    setChoice(nextChoice)
    setOpen(false)
  }

  const resetConsent = () => {
    clearCookieConsent()
    setChoice("essential")
  }

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
        Cookie
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
              Cookie preferences
            </DialogTitle>
            <DialogDescription>
              We use a session cookie for sign-in and first-party preference
              cookies for locale and theme. There are no third-party analytics
              or ad cookies on this site.
            </DialogDescription>
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
              Changing this preference updates the consent cookie in your
              browser. You can return here any time to revise it.
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
            <button
              type="button"
              onClick={resetConsent}
              className="hover:text-ink"
            >
              Reset
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
