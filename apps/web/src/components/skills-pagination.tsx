import { m } from "@/paraglide/messages";

interface Props {
  currentPage: number;
  nextHref: string | null;
  prevHref: string | null;
}

const PAGINATION_LINK_CLS = "border border-rule px-2.5 py-1.5 text-ink hover:bg-paper-2";
const PAGINATION_DISABLED_CLS = "border border-rule px-2.5 py-1.5 text-muted-text cursor-default";

export function SkillsPagination({ currentPage, nextHref, prevHref }: Props) {
  return (
    <div className="flex justify-center gap-2 border-b border-rule py-7.5 font-mono text-[11px] tracking-[.14em] uppercase">
      {prevHref ? (
        <a href={prevHref} className={PAGINATION_LINK_CLS}>
          {m.skills_pagination_prev()}
        </a>
      ) : (
        <span className={PAGINATION_DISABLED_CLS}>{m.skills_pagination_prev()}</span>
      )}
      <span className="border border-rule bg-ink px-2.5 py-1.5 text-paper">
        {String(currentPage).padStart(2, "0")}
      </span>
      {nextHref ? (
        <a href={nextHref} className={PAGINATION_LINK_CLS}>
          {m.skills_pagination_next()}
        </a>
      ) : (
        <span className={PAGINATION_DISABLED_CLS}>{m.skills_pagination_next()}</span>
      )}
    </div>
  );
}
