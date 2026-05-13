import { m } from "@/paraglide/messages";
import { Link } from "@tanstack/react-router";

const MENUS = [
  { label: m.header_skills(), path: "/skills" },
  { label: m.header_categories(), path: "/categories" },
  // { label: m.header_collections(), path: "/collections" },
  { label: m.header_tags(), path: "/tags" },
  { label: m.header_authors(), path: "/authors" },
  { label: m.header_docs(), path: "/docs" },
];

export const DesktopMenu = () => (
  <div className="hidden items-center gap-4.5 md:flex">
    {MENUS.map((menu) => (
      <Link
        to={menu.path}
        key={menu.path}
        inactiveProps={{ className: "text-muted-foreground" }}
        activeProps={{ className: "underline" }}
      >
        {menu.label}
      </Link>
    ))}
  </div>
);
