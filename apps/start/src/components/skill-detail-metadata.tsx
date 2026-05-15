import { memo } from "react";
import type { ReactNode } from "react";
import {
  ClockIcon,
  FileTextIcon,
  GithubLogoIcon,
  GitForkIcon,
  StarIcon,
  ArrowUpRightIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAuthorDetail } from "@/functions/authors/get-author-detail";

import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { getAuthorDisplayName, getAvatarLabel } from "@/utils/author-shared";
import { TimeValue } from "./time-value";

interface Props {
  authorHandle: string;
  forkCount?: number | null;
  license?: string | null;
  repoName: string;
  repoUrl?: string | null;
  stargazerCount?: number | null;
  updatedAt?: number | null;
}

const Row = ({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) => (
  <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 py-3">
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className="flex size-8 shrink-0 items-center justify-center bg-background/40">
        {icon}
      </span>
      <span className="font-mono text-[9.5px] uppercase tracking-[.18em]">{label}</span>
    </div>
    <div className="min-w-0 text-right text-xs font-mono leading-[1.35] text-foreground">
      {value}
    </div>
  </div>
);

export const SkillDetailMetadata = memo(
  ({ authorHandle, forkCount, license, repoName, repoUrl, stargazerCount, updatedAt }: Props) => {
    const locale = getLocale();
    const getAuthor = useServerFn(getAuthorDetail);
    const { data: author } = useQuery({
      queryKey: ["skillDetailMetadataAuthor", authorHandle],
      queryFn: () => getAuthor({ data: { handle: authorHandle } }),
    });

    const authorName = author ? getAuthorDisplayName(author) : `@${authorHandle}`;
    const avatarLabel = author
      ? getAvatarLabel(author)
      : authorHandle.trim().charAt(0).toUpperCase();
    const repoLabel = `${authorHandle}/${repoName}`;

    return (
      <div className="border-border border-b py-6">
        <div className="mb-3 font-mono text-[9.5px] uppercase tracking-[.18em] text-muted-foreground">
          {String(m.skill_detail_metadata_title())}
        </div>

        <div className="divide-border/70 divide-y border-t border-border/70">
          <Row
            icon={
              <Avatar className="size-4 border-0 shadow-none rounded-none after:hidden">
                {author?.avatarUrl ? (
                  <AvatarImage className="rounded-none" alt={authorName} src={author.avatarUrl} />
                ) : null}
                <AvatarFallback className="text-[9px] rounded-none">{avatarLabel}</AvatarFallback>
              </Avatar>
            }
            label={String(m.skill_detail_meta_author())}
            value={
              <Link
                to="/authors/$handle"
                params={{ handle: authorHandle }}
                className="inline-flex items-center gap-1 transition-colors hover:text-muted-foreground"
              >
                <span className="truncate">{authorName}</span>
              </Link>
            }
          />

          <Row
            icon={<GithubLogoIcon className="size-4" />}
            label={String(m.skill_detail_meta_repository())}
            value={
              repoUrl ? (
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex max-w-full items-center justify-end gap-1 overflow-hidden transition-colors hover:text-muted-foreground"
                >
                  <span className="min-w-0 truncate">{repoLabel}</span>
                  <ArrowUpRightIcon className="size-3 shrink-0" />
                </a>
              ) : (
                repoLabel
              )
            }
          />

          <Row
            icon={<StarIcon className="size-4" />}
            label="GitHub Stars"
            value={Intl.NumberFormat(locale).format(stargazerCount ?? 0)}
          />

          <Row
            icon={<GitForkIcon className="size-4" />}
            label="GitHub Forks"
            value={Intl.NumberFormat(locale).format(forkCount ?? 0)}
          />

          <Row
            icon={<ClockIcon className="size-4" />}
            label={String(m.skill_detail_meta_updated())}
            value={updatedAt ? <TimeValue locale={locale} time={updatedAt} /> : "—"}
          />

          <Row
            icon={<FileTextIcon className="size-4" />}
            label={String(m.skill_detail_meta_license())}
            value={license ?? "No license"}
          />
        </div>
      </div>
    );
  },
);
