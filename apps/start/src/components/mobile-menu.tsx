import { useAtom } from "jotai";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { isMobileMenuOpenAtom } from "@/atoms/app";
import { LanguageSwitcher } from "@/components/language-switcher";
import { m } from "@/paraglide/messages";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_LINKS = [
  { label: m.mobile_menu_skills(), to: "/skills" },
  { label: m.mobile_menu_collections(), to: "/collections/" },
  { label: m.mobile_menu_authors(), to: "/authors/" },
  { label: m.mobile_menu_search(), to: "/search" },
];

export const MobileMenu = () => {
  const [isOpen, setIsOpen] = useAtom(isMobileMenuOpenAtom);

  return (
    <Drawer direction="top" open={isOpen} onOpenChange={(v) => setIsOpen(v)}>
      <button
        type="button"
        aria-label="Open navigation menu"
        className="cursor-pointer p-1 md:hidden"
        onClick={(e) => {
          (e.currentTarget as HTMLButtonElement).blur();
          setIsOpen(!isOpen);
        }}
      >
        <span className="relative block size-5" aria-hidden>
          <span
            className={cn(
              "absolute inset-x-0 h-px origin-center bg-current transition-all duration-200",
              {
                "top-1/2 rotate-45": isOpen,
                "top-1": !isOpen,
              },
            )}
          />
          <span
            className={cn(
              "absolute inset-x-0 top-1/2 h-px bg-current transition-opacity duration-200",
              {
                "opacity-0": isOpen,
                "opacity-100": !isOpen,
              },
            )}
          />
          <span
            className={cn(
              "absolute inset-x-0 h-px origin-center bg-current transition-all duration-200",
              {
                "top-1/2 -rotate-45": isOpen,
                "top-4": !isOpen,
              },
            )}
          />
        </span>
      </button>

      <DrawerContent className="border-b border-border bg-paper data-[vaul-drawer-direction=top]:mb-0 data-[vaul-drawer-direction=top]:h-[calc(100dvh-(--header-height))] data-[vaul-drawer-direction=top]:max-h-[calc(100dvh-(--header-height))] data-[vaul-drawer-direction=top]:mt-(--header-height)">
        <DrawerHeader className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <DrawerTitle className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              {m.mobile_menu_title()}
            </DrawerTitle>
            <DrawerClose asChild>
              <button
                aria-label={m.mobile_menu_close()}
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
              <li key={link.to} className="border-b border-border last:border-b-0">
                <DrawerClose asChild>
                  <Link
                    to={link.to}
                    className="block py-4 font-mono text-2xl transition-colors hover:text-foreground"
                    inactiveProps={{ className: "text-foreground/70" }}
                    activeProps={{ className: "text-foreground" }}
                  >
                    {link.label}
                  </Link>
                </DrawerClose>
              </li>
            ))}
          </ul>
        </nav>
        <DrawerFooter>
          <div className="flex items-center justify-between">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
