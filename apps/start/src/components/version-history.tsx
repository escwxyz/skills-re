import { m } from "@/paraglide/messages";

import type { SkillVersionHistoryItem } from "@/utils/types";

interface Props {
  activeSnapshotId?: string | null;
  versions: SkillVersionHistoryItem[];
}

// todo use select component
export const VersionHistory = ({ activeSnapshotId, versions }: Props) => (
  <div>
    <div className="font-mono text-muted-text mb-2.5 uppercase">{m.skill_detail_changelog()}</div>
    <div>
      {versions.map((version, index) => {
        const isSelected = version.snapshotId === activeSnapshotId;

        return (
          <div
            key={`${version.version}-${version.date}`}
            className={isSelected ? "border-l-2 border-editorial-red pl-2" : undefined}
          >
            <div className="flex gap-2 px-1.5 justify-between items-baseline">
              <span
                className={`font-mono text-[11px] tracking-[0.04em] ${isSelected ? "text-editorial-red" : "text-[color:var(--ink)]"}`}
              >
                v.{version.version}
                {version.label && (
                  <span className="text-[color:var(--muted-foreground)] ml-1">
                    ({version.label === "current" ? m.skill_detail_current() : version.label})
                  </span>
                )}
              </span>
              {isSelected && (
                <span className="font-mono text-[9.5px] uppercase tracking-[.18em] text-editorial-red">
                  {m.skill_version_selected()}
                </span>
              )}
              <span className="font-mono text-[10.5px] tracking-[0.06em] whitespace-nowrap text-[color:var(--muted-foreground)]">
                {version.date}
              </span>
            </div>
            {index < versions.length - 1 && (
              <div className="border-t border-dashed border-[color:var(--rule)] opacity-50" />
            )}
          </div>
        );
      })}
    </div>
  </div>
);
