import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { Link } from "@tanstack/react-router";

const FOOTER_MENUS = [
  {
    title: m.footer_platform_title(),
    children: [
      {
        label: m.footer_publish_changelog(),
        href: "/changelog",
      },
      {
        label: m.footer_publish_docs(),
        href: "/docs",
      },
    ],
  },
  {
    title: m.footer_legal_title(),
    children: [
      {
        label: m.footer_legal_imprint(),
        href: "/imprint",
      },
      {
        label: m.footer_legal_terms(),
        href: "/terms",
      },
      {
        label: m.footer_legal_privacy(),
        href: "/privacy",
      },
      {
        label: m.footer_legal_cookies(),
        href: "/cookies",
      },
    ],
  },
];

interface Props {
  className?: string;
}

export const Footer = ({ className }: Props) => (
  <footer
    className={cn(
      "border-border mx-auto mt-7.5 mb-1.5 grid w-full grid-cols-1 gap-8 border-t-[3px] px-4 md:px-6 py-10 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr]",
      className,
    )}
  >
    <div>
      <div className="font-display mb-4 text-[40px] leading-none italic">
        skills.<em>re</em>
      </div>
      <p className="text-ink-2 font-serif text-[13px]">{m.footer_description({})}</p>
    </div>
    {FOOTER_MENUS.map((menu) => (
      <div key={String(menu.title)}>
        <h6 className="mb-3 font-mono text-[10.5px] tracking-[.16em] uppercase">{menu.title}</h6>
        <ul className="text-ink-2 m-0 list-none p-0 font-mono text-[11px] leading-loose">
          {menu.children.map((item) => (
            <li key={item.href}>
              <Link to={item.href}>{item.label}</Link>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </footer>
);
