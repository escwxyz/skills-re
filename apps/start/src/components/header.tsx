import { m } from "@/paraglide/messages";
import { localizeHref } from "@/paraglide/runtime";
import { Link, useLocation, useRouteContext } from "@tanstack/react-router";
import { isActiveLocalizedPath } from "@/lib/navigation";
import { MobileMenu } from "@/components/mobile-menu";
import { LanguageSwitcher } from "@/components/language-switcher";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { CloudArrowUpIcon } from "@phosphor-icons/react";
import { useSetAtom } from "jotai";
import { LoginDialog } from "@/components/login-dialog";
import { isLoginDialogOpenAtom } from "@/atoms/app";

const MENUS = [
  { label: m.header_skills(), path: "/skills" },
  { label: m.header_categories(), path: "/categories" },
  { label: m.header_collections(), path: "/collections" },
  { label: m.header_authors(), path: "/authors" },
  { label: m.header_docs(), path: "/docs" },
];

export const Header = () => {
  const { currentUser } = useRouteContext({ from: "__root__" });

  const getLocalizedHref = (path: string) => localizeHref(path);

  const location = useLocation();

  const isActive = (href: string) => isActiveLocalizedPath(location.pathname, href);

  const setLoginDialogOpen = useSetAtom(isLoginDialogOpenAtom);

  return (
    <header className="h-(--header-height) bg-background/80 sticky top-0 z-100 grid place-items-center border-b pr-3 pl-6 font-mono text-[11px] tracking-[0.08em] uppercase backdrop-blur-sm">
      <nav className="grid w-full grid-cols-[1fr_auto_1fr] items-center">
        <div className="hidden items-center gap-4.5 md:flex">
          {MENUS.map((menu) => (
            <Link
              to={menu.path}
              key={menu.path}
              className={
                isActive(getLocalizedHref(menu.path)) ? "underline" : "text-muted-foreground"
              }
            >
              {menu.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center md:hidden">
          <MobileMenu currentPathname={location.pathname} />
        </div>
        <Link
          to={getLocalizedHref("/")}
          className="font-display text-foreground text-center text-[22px] tracking-normal normal-case italic"
        >
          <b className="font-serif not-italic">skills</b>
          <i>.re</i>
        </Link>
        <div className="flex items-center justify-end gap-4.5">
          <LanguageSwitcher className="hidden md:flex" />
          <Link
            to={getLocalizedHref("/submit")}
            className={cn("no-underline", buttonVariants({ variant: "secondary" }))}
          >
            <CloudArrowUpIcon />
            <span className="hidden md:inline">{m.header_submit()}</span>
          </Link>
          {currentUser ? (
            <Link to={getLocalizedHref("/account")}>{currentUser.name}</Link>
          ) : (
            <LoginDialog onOpenChange={(open) => !open && setLoginDialogOpen(false)} />
          )}
        </div>
      </nav>
    </header>
  );
};
