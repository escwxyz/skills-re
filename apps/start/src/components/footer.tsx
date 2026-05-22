import { GithubLogoIcon, XLogoIcon, DiscordLogoIcon } from "@phosphor-icons/react";

import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { CookieConsent } from "@/components/cookie-consent";
import { DotMap } from "./dotmap";

interface InternalItem {
  label: string;
  href: string;
  external?: false;
  Icon?: never;
}
interface ExternalItem {
  label: string;
  href: string;
  external: true;
  Icon?: React.ComponentType;
}

type MenuItem = InternalItem | ExternalItem;

const FOOTER_MENUS: { title: string; children: MenuItem[] }[] = [
  {
    title: m.footer_platform_title(),
    children: [
      { label: m.footer_platform_changelogs(), href: "/changelogs" },
      { label: m.footer_platform_docs(), href: "/docs" },
      {
        label: m.footer_platform_faq(),
        href: "/faq",
      },
    ],
  },
  {
    title: m.footer_legal_title(),
    children: [
      // { label: m.footer_legal_imprint(), href: "/imprint" },
      { label: m.footer_legal_terms(), href: "/terms" },
      { label: m.footer_legal_privacy(), href: "/privacy" },
      { label: m.footer_legal_cookies(), href: "/cookies" },
    ],
  },
  {
    title: m.footer_socials_title(),
    children: [
      {
        label: "GitHub",
        Icon: GithubLogoIcon,
        href: "https://github.com/escwxyz",
        external: true,
      },
      {
        label: "X(Twitter)",
        Icon: XLogoIcon,
        href: "https://x.com/escw_xyz",
        external: true,
      },
      {
        label: "Discord",
        Icon: DiscordLogoIcon,
        href: "https://discordapp.com/users/352134766738407424",
        external: true,
      },
    ],
  },
];

interface Props {
  className?: string;
}

export const Footer = ({ className }: Props) => {
  const year = new Date().getFullYear();
  return (
    <footer
      className={cn(
        "border-border relative overflow-hidden mx-auto mt-7.5 mb-1.5 border-t px-4 md:px-6 py-10",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-screen sm:translate-y-[25vh] lg:translate-y-[35vh] opacity-90"
      >
        <DotMap className="h-full w-full" imageSrc="/images/hands.webp" />
      </div>
      <div className="relative z-10 grid w-full grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr] mb-8">
        <div>
          <Link
            className="group mb-4 flex cursor-pointer items-center gap-3 transition-opacity hover:opacity-80"
            to="/"
            title="skills.re"
          >
            <Logo size={48} />
            <div className="font-display text-4xl leading-none italic">
              skills.<em>re</em>
            </div>
          </Link>

          <p className="text-muted-foreground font-serif text-sm">{m.footer_description({})}</p>
        </div>
        {FOOTER_MENUS.map((menu) => (
          <div key={String(menu.title)}>
            <h6 className="mb-3 font-mono text-base uppercase">{menu.title}</h6>
            <ul className="text-muted-foreground m-0 list-none p-0 font-mono text-sm space-y-1.5">
              {menu.children.map((item) => (
                <li key={item.href} className="flex items-center gap-1.5">
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={item.label}
                      className="flex items-center gap-1.5"
                    >
                      {item.Icon ? <item.Icon /> : null}
                      {item.label}
                    </a>
                  ) : (
                    <Link to={item.href} title={item.label}>
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="relative z-10 flex flex-col items-center justify-between gap-4 border-border border-t pt-8 font-mono text-muted-foreground text-xs md:flex-row">
        <p>© {year} SKILLS.re. </p>
        <div className="flex items-center gap-4">
          <CookieConsent />
          <LanguageSwitcher />
          {/* <p className="flex items-center gap-2 uppercase">
            Status:{" "}
            <span className="animate-pulse rounded border px-1 border-chart-2/20 bg-chart-2/10 text-chart-2">
              OK
            </span>
          </p> */}
        </div>
      </div>
    </footer>
  );
};
