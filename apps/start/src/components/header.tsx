import { m } from "@/paraglide/messages";
import { Link, useRouteContext } from "@tanstack/react-router";
import { MobileMenu } from "@/components/mobile-menu";
import { LanguageSwitcher } from "@/components/language-switcher";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { CloudArrowUpIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useSetAtom } from "jotai";
import { LoginDialog } from "@/components/login-dialog";
import { isLoginDialogOpenAtom } from "@/atoms/app";
import { ThemeToggle } from "@/components/theme-toggle";
import { DesktopMenu } from "@/components/desktop-menu";
import { NavUser } from "@/components/nav-user";

export const Header = () => {
  const { currentUser } = useRouteContext({ from: "__root__" });

  const setLoginDialogOpen = useSetAtom(isLoginDialogOpenAtom);

  return (
    <header className="h-(--header-height) bg-background sticky top-0 z-100 grid place-items-center border-b px-4 md:px-6 font-mono text-[11px] tracking-[0.08em] uppercase backdrop-blur-sm">
      <nav className="grid w-full grid-cols-[1fr_auto_1fr] items-center">
        <DesktopMenu />
        <MobileMenu />
        <Link
          to="/"
          className="font-display text-foreground text-center text-[22px] tracking-normal normal-case italic"
        >
          <b className="font-serif not-italic">skills</b>
          <i>.re</i>
        </Link>
        <div className="flex items-center justify-end gap-2 md:gap-4.5">
          <ThemeToggle className="hidden md:block" />
          <LanguageSwitcher className="hidden md:flex" />
          <Link
            to="/submit"
            className={cn(
              "no-underline hidden! md:inline-flex!",
              buttonVariants({ variant: "secondary" }),
            )}
          >
            <CloudArrowUpIcon />
            <span className="normal-case">{m.header_submit()}</span>
          </Link>
          <Link
            to="/skills"
            search={{ mode: "search" }}
            className={cn("no-underline md:hidden", buttonVariants({ variant: "link" }))}
          >
            <MagnifyingGlassIcon />
          </Link>
          {currentUser ? (
            <NavUser currentUser={currentUser} />
          ) : (
            <LoginDialog onOpenChange={(open) => !open && setLoginDialogOpen(false)} />
          )}
        </div>
      </nav>
    </header>
  );
};
