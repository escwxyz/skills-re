import type { Icon } from "@phosphor-icons/react";
import {
  ChartBarIcon,
  ChatsIcon,
  ClockCounterClockwiseIcon,
  FileTextIcon,
  ShieldCheckIcon,
  TerminalWindowIcon,
  TreeViewIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";

type SkillDetailTabId =
  | "skill.md"
  | "file-tree"
  | "sandbox"
  | "audit"
  | "evals"
  | "reviews"
  | "changelog";

interface Props {
  author: string;
  repo: string;
  snapshotId: string | null;
  slug: string;
}

interface SkillDetailTabItem {
  id: SkillDetailTabId;
  label: string;
  to: string;
  icon: Icon;
  exact?: boolean;
}

const BASE_CLASS = "flex items-center gap-2 border-r border-border px-5 py-3.5 no-underline";

export const SKILL_DETAIL_TABS: SkillDetailTabItem[] = [
  {
    id: "skill.md",
    label: String(m.skill_detail_overview()),
    to: "/skills/$author/$repo/$slug/",
    icon: FileTextIcon,
    exact: true,
  },
  {
    id: "file-tree",
    label: String(m.skill_detail_file_tree()),
    to: "/skills/$author/$repo/$slug/file-tree",
    icon: TreeViewIcon,
  },
  {
    id: "audit",
    label: String(m.skill_detail_static_audit()),
    to: "/skills/$author/$repo/$slug/audit",
    icon: ShieldCheckIcon,
  },
  {
    id: "sandbox",
    label: String(m.skill_detail_sandbox()),
    to: "/skills/$author/$repo/$slug/sandbox",
    icon: TerminalWindowIcon,
  },
  {
    id: "evals",
    label: String(m.skill_eval_evals()),
    to: "/skills/$author/$repo/$slug/evals",
    icon: ChartBarIcon,
  },
  {
    id: "reviews",
    label: String(m.skill_detail_review_tab()),
    to: "/skills/$author/$repo/$slug/reviews",
    icon: ChatsIcon,
  },
  {
    id: "changelog",
    label: String(m.skill_detail_changelog()),
    to: "/skills/$author/$repo/$slug/changelog",
    icon: ClockCounterClockwiseIcon,
  },
];

export const SkillDetailTabs = ({ author, repo, snapshotId, slug }: Props) => (
  <div className="flex min-w-0 flex-1 overflow-x-auto">
    {SKILL_DETAIL_TABS.map((tab) => {
      const Icon = tab.icon;

      return (
        <Link
          key={tab.id}
          to={tab.to}
          params={{ author, repo, slug }}
          search={{ snapshotId: snapshotId ?? undefined }}
          className={BASE_CLASS}
          activeProps={{ className: "bg-primary text-primary-foreground" }}
          inactiveProps={{ className: "text-muted-text bg-transparent" }}
          activeOptions={tab.exact ? { exact: true } : undefined}
          aria-label={tab.label}
          title={tab.label}
          resetScroll={false}
        >
          <Icon aria-hidden className="size-4 shrink-0" />
          <span className="hidden sm:inline">{tab.label}</span>
        </Link>
      );
    })}
  </div>
);
