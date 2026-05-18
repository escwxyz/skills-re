import { m } from "@/paraglide/messages";
import { Link, useRouteContext } from "@tanstack/react-router";
import { MobileMenu } from "@/components/mobile-menu";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { CloudArrowUpIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useSetAtom } from "jotai";
import { LoginDialog } from "@/components/login-dialog";
import { loginDialogAtom } from "@/atoms/app";
import { DesktopMenu } from "@/components/desktop-menu";
import { NavUser } from "@/components/nav-user";
import { HumanHand, RobotHand } from "@/components/logo";
import { motion } from "motion/react";
import { ThemeToggle } from "@/components/theme-toggle";

export const Header = () => {
  const { currentUser } = useRouteContext({ from: "__root__" });

  const setLoginDialog = useSetAtom(loginDialogAtom);

  return (
    <header className="h-(--header-height) bg-background sticky top-0 z-100 grid place-items-center border-b px-4 md:px-6 font-mono text-[11px] tracking-[0.08em] uppercase backdrop-blur-sm">
      <nav className="grid w-full grid-cols-[1fr_auto_1fr] items-center">
        <DesktopMenu />
        <MobileMenu />
        <Link
          to="/"
          className="font-display text-foreground flex items-center justify-center gap-1 text-[22px] tracking-normal normal-case italic"
        >
          <motion.span
            initial={{ x: -8, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <HumanHand size="1.6em" />
          </motion.span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <b className="font-serif not-italic">skills</b>
            <i>.re</i>
          </motion.span>
          <motion.span
            initial={{ x: 8, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <RobotHand size="1.6em" />
          </motion.span>
        </Link>
        <div className="flex items-center justify-end gap-2 md:gap-4.5">
          <ThemeToggle className="hidden md:block" />
          <Link
            to="/skills"
            search={{ mode: "search" }}
            className={cn("no-underline", buttonVariants({ variant: "ghost" }))}
          >
            <MagnifyingGlassIcon />
          </Link>
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
          {currentUser ? (
            <NavUser currentUser={currentUser} />
          ) : (
            <LoginDialog
              onOpenChange={(open) => !open && setLoginDialog((prev) => ({ ...prev, open: false }))}
            />
          )}
        </div>
      </nav>
    </header>
  );
};
