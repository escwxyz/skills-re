import { Link } from "@tanstack/react-router";

interface PageBreadcrumbProps {
  current: string;
  parent?: {
    label: string;
    to: string;
  };
  rootLabel?: string;
}

export const PageBreadcrumb = ({ current, parent, rootLabel = "Home" }: PageBreadcrumbProps) => (
  <div className="mb-4 flex flex-wrap items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
    <Link className="transition-colors hover:text-foreground" to="/">
      {rootLabel}
    </Link>
    <span>/</span>
    {parent ? (
      <>
        <Link className="transition-colors hover:text-foreground" to={parent.to}>
          {parent.label}
        </Link>
        <span>/</span>
      </>
    ) : null}
    <span className="text-foreground">{current}</span>
  </div>
);
