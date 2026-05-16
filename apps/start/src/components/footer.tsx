import { GithubLogoIcon, XLogoIcon } from "@phosphor-icons/react";
import type { IconProps } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { ForwardRefExoticComponent } from "react";

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
  Icon?: ForwardRefExoticComponent<IconProps>;
}

type MenuItem = InternalItem | ExternalItem;

const FOOTER_MENUS: { title: string; children: MenuItem[] }[] = [
  {
    title: m.footer_platform_title(),
    children: [
      { label: m.footer_publish_changelog(), href: "/changelog" },
      { label: m.footer_publish_docs(), href: "/docs" },
    ],
  },
  {
    title: m.footer_legal_title(),
    children: [
      { label: m.footer_legal_imprint(), href: "/imprint" },
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
        href: "https://github.com/skills-re",
        external: true,
      },
      {
        label: "X",
        Icon: XLogoIcon,
        href: "https://x.com/skills_re",
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
      className={cn("border-border mx-auto mt-7.5 mb-1.5 border-t px-4 md:px-6 py-10", className)}
    >
      <div className="grid w-full grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr] mb-8">
        <div>
          <div className="font-display mb-4 text-4xl leading-none italic">
            skills.<em>re</em>
          </div>
          <p className="text-muted-foreground font-serif text-sm">{m.footer_description({})}</p>
        </div>
        {FOOTER_MENUS.map((menu) => (
          <div key={String(menu.title)}>
            <h6 className="mb-3 font-mono text-base uppercase">{menu.title}</h6>
            <ul className="text-muted-foreground m-0 list-none p-0 font-mono text-sm">
              {menu.children.map((item) => (
                <li key={item.href} className="flex items-center gap-1.5">
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5"
                    >
                      {item.Icon ? <item.Icon /> : null}
                      {item.label}
                    </a>
                  ) : (
                    <Link to={item.href}>{item.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center justify-between gap-4 border-border border-t pt-8 font-mono text-muted-foreground text-xs md:flex-row">
        <p>© {year} SKILLS.re. </p>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <ThemeToggle />
          <p className="flex items-center gap-2 uppercase">
            Status:{" "}
            <span className="animate-pulse rounded border px-1 border-chart-2/20 bg-chart-2/10 text-chart-2">
              OK
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
};
