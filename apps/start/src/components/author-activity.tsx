// only available when the user is verified and configured to be public
import { TimeValue } from "@/components/time-value";
import { getLocale } from "@/paraglide/runtime";
import {
  author_activity_latest_updates,
  author_activity_none,
  author_activity_published,
  author_activity_title,
  author_activity_updated,
} from "@/paraglide/messages";

interface AuthorActivityItem {
  date: number;
  itemLabel: string;
  text: "Published" | "Updated";
}

interface Props {
  items: AuthorActivityItem[];
}

export const AuthorActivity = ({ items }: Props) => (
  <aside className="px-6 py-9 md:pl-8">
    <div className="border-border mb-5 flex items-baseline justify-between border-b pb-3">
      <h3 className="font-display m-0 text-2xl font-normal">{author_activity_title()}</h3>
      <div className="text-muted-foreground font-mono text-[10.5px] tracking-[.14em] uppercase">
        {author_activity_latest_updates()}
      </div>
    </div>
    {items.length > 0 ? (
      items.map((act) => <AuthorActivityRow key={act.itemLabel} act={act} />)
    ) : (
      <p className="text-muted-foreground font-serif italic">{author_activity_none()}</p>
    )}
  </aside>
);

const AuthorActivityRow = ({ act }: { act: AuthorActivityItem }) => {
  const locale = getLocale();

  return (
    <div className="border-border grid grid-cols-[90px_1fr] gap-3 border-b border-dashed py-2.5 font-mono text-[11.5px]">
      <span className="text-muted-foreground tracking-[.08em]">
        <TimeValue locale={locale} time={act.date} />
      </span>
      <span>
        {act.text === "Updated" ? author_activity_updated() : author_activity_published()}{" "}
        <b className="text-destructive font-medium">{act.itemLabel}</b>
      </span>
    </div>
  );
};
