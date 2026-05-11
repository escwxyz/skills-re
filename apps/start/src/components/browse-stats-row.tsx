import { formatInteger } from "@/utils/format";
import { m } from "@/paraglide/messages";

export const BrowseStatsRow = ({
  hasItems,
  sortLabel,
  totalSkills,
  from,
  to,
}: {
  from: number;
  hasItems: boolean;
  sortLabel: string;
  to: number;
  totalSkills: number;
}) => (
  <div className="border-border text-muted-text flex items-center border-b px-6 py-2.5 font-mono text-[10.5px] tracking-[.14em] uppercase">
    {hasItems ? (
      <span>
        {m.skills_browse_showing_results({
          from: String(from),
          plus: "",
          sort: sortLabel,
          to: String(to),
          total: formatInteger(totalSkills),
        })}
      </span>
    ) : (
      <span>{m.skills_browse_showing_empty({ sort: sortLabel })}</span>
    )}
  </div>
);
