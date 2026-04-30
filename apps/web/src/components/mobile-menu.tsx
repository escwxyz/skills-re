"use client";

import { useStore } from "@nanostores/react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { isMobileMenuOpenAtom } from "@/stores/app";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { m } from "@/paraglide/messages";
import { getLocale, localizeHref } from "@/paraglide/runtime";

interface Props {
  currentPathname: string;
}

export const MobileMenu = ({ currentPathname }: Props) => {
  const isOpen = useStore(isMobileMenuOpenAtom);
  const currentLocale = getLocale();

  const NAV_LINKS = [
    { label: m.mobile_menu_skills(), href: localizeHref("/skills") },
    { label: m.mobile_menu_collections(), href: localizeHref("/collections") },
    { label: m.mobile_menu_authors(), href: localizeHref("/authors") },
    { label: m.mobile_menu_search(), href: localizeHref("/search") },
  ];

  return (
    <Drawer direction="top" open={isOpen} onOpenChange={(v) => isMobileMenuOpenAtom.set(v)}>
      <button
        type="button"
        aria-label="Open navigation menu"
        className="cursor-pointer p-1 md:hidden"
        onClick={(e) => {
          (e.currentTarget as HTMLButtonElement).blur();
          isMobileMenuOpenAtom.set(!isOpen);
        }}
      >
        <span className="relative block size-5" aria-hidden>
          <span
            className={`absolute inset-x-0 h-px origin-center bg-current transition-all duration-200 ${isOpen ? "top-1/2 rotate-45" : "top-1"}`}
          />
          <span
            className={`absolute inset-x-0 top-1/2 h-px bg-current transition-opacity duration-200 ${isOpen ? "opacity-0" : ""}`}
          />
          <span
            className={`absolute inset-x-0 h-px origin-center bg-current transition-all duration-200 ${isOpen ? "top-1/2 -rotate-45" : "top-4"}`}
          />
        </span>
      </button>

      <DrawerContent className="border-b border-rule bg-paper data-[vaul-drawer-direction=top]:mb-0 data-[vaul-drawer-direction=top]:h-[calc(100dvh-(--header-height))] data-[vaul-drawer-direction=top]:max-h-[calc(100dvh-(--header-height))] data-[vaul-drawer-direction=top]:mt-(--header-height)">
        <DrawerHeader className="border-b border-rule px-6 py-4">
          <div className="flex items-center justify-between">
            <DrawerTitle className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              {m.mobile_menu_title()}
            </DrawerTitle>
            <DrawerClose asChild>
              <button
                type="button"
                className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground transition-colors hover:text-foreground"
              >
                {m.mobile_menu_close()}
              </button>
            </DrawerClose>
          </div>
          <DrawerDescription className="sr-only">{m.mobile_menu_description()}</DrawerDescription>
        </DrawerHeader>

        <nav className="flex-1 overflow-y-auto px-6 py-6">
          <ul className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <li key={link.href} className="border-b border-rule last:border-b-0">
                <DrawerClose asChild>
                  <a
                    href={link.href}
                    className={`block py-4 font-mono text-2xl transition-colors hover:text-foreground ${
                      currentPathname.includes(link.href) ? "text-foreground" : "text-foreground/70"
                    }`}
                  >
                    {link.label}
                  </a>
                </DrawerClose>
              </li>
            ))}
          </ul>
        </nav>
        <DrawerFooter>
          <div className="flex items-center justify-between">
            <ThemeToggle />
            <LanguageSwitcher locale={currentLocale} />
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
