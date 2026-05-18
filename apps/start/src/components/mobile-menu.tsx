import { useAtom } from "jotai";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { isMobileMenuOpenAtom } from "@/atoms/app";
import { m } from "@/paraglide/messages";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { CloudArrowUpIcon } from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";

const NAV_LINKS = [
  { label: m.mobile_menu_skills(), to: "/skills" },
  { label: m.mobile_menu_categories(), to: "/categories" },
  // { label: m.mobile_menu_collections(), to: "/collections" },
  { label: m.mobile_menu_tags(), to: "/tags" },
  { label: m.mobile_menu_authors(), to: "/authors" },
];

export const MobileMenu = () => {
  const [isOpen, setIsOpen] = useAtom(isMobileMenuOpenAtom);

  return (
    <Drawer direction="top" open={isOpen} onOpenChange={(v) => setIsOpen(v)}>
      <DrawerTrigger asChild>
        <button type="button" aria-label="Open navigation menu" className="p-1 md:hidden">
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
      </DrawerTrigger>

      <DrawerContent className="border-b border-border bg-background data-[vaul-drawer-direction=top]:mb-0 data-[vaul-drawer-direction=top]:h-[calc(100dvh-(--header-height))] data-[vaul-drawer-direction=top]:max-h-[calc(100dvh-(--header-height))] data-[vaul-drawer-direction=top]:mt-(--header-height)">
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
          <div className="flex items-center justify-between gap-2.5">
            <ThemeToggle />
            <Link
              to="/submit"
              className={cn(
                "no-underline! inline-flex font-mono",
                buttonVariants({ variant: "ghost", size: "lg" }),
              )}
            >
              <CloudArrowUpIcon />
            </Link>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
