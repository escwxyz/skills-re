import { GithubLogoIcon } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import {
  author_repo_list_all_repositories,
  author_repo_list_empty,
  author_repo_list_open_on_github,
  author_repo_list_select_repository,
  author_repo_list_show_every_public_skill,
  author_repo_list_skill_count,
  author_repo_list_summary,
  author_stats_repositories,
} from "@/paraglide/messages";

interface AuthorRepoListItem {
  nameWithOwner: string;
  repoName: string;
  repoOwner: string;
  skillCount: number;
}

interface Props {
  onSelectRepo: (repoName?: string) => void;
  repoCount?: number;
  repos: AuthorRepoListItem[];
  selectedRepoName?: string;
}

export const AuthorRepoList = ({ onSelectRepo, repoCount, repos, selectedRepoName }: Props) => {
  const totalSkills = repos.reduce((sum, repo) => sum + repo.skillCount, 0);

  return (
    <aside className="lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto py-9 pr-6 pl-4 md:pr-8 md:pl-6">
      <div className="border-border mb-5 flex items-baseline justify-between border-b pb-3">
        <h3 className="font-display m-0 text-[32px] font-normal">
          {String(author_stats_repositories())}
        </h3>
        <div className="text-muted-foreground font-mono text-[10.5px] tracking-[.14em] uppercase">
          {author_repo_list_summary({
            repoCount: String(repoCount ?? repos.length),
            skillCount: String(totalSkills),
          })}
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          className={cn(
            "border-border flex w-full items-center justify-between gap-4 border border-dashed px-4 py-3 text-left transition-colors",
            selectedRepoName
              ? "hover:border-foreground hover:bg-muted/40"
              : "border-foreground bg-muted/40",
          )}
          onClick={() => onSelectRepo()}
          aria-pressed={!selectedRepoName}
        >
          <div className="min-w-0">
            <div className="font-display truncate text-lg font-normal">
              {author_repo_list_all_repositories()}
            </div>
            <div className="text-muted-foreground truncate font-mono text-[10px] tracking-[.14em] uppercase">
              {author_repo_list_show_every_public_skill()}
            </div>
          </div>
          <div className="text-muted-foreground shrink-0 font-mono text-[10px] tracking-[.14em] uppercase">
            {author_repo_list_summary({
              repoCount: String(repoCount ?? repos.length),
              skillCount: String(totalSkills),
            })}
          </div>
        </button>

        {repos.map((repo) => {
          const isActive = selectedRepoName === repo.repoName;

          return (
            <div
              key={repo.nameWithOwner}
              className={cn(
                "border-border flex w-full items-stretch gap-3 border border-dashed px-4 py-3 transition-colors",
                isActive
                  ? "border-foreground bg-muted/40"
                  : "hover:border-foreground hover:bg-muted/40",
              )}
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => onSelectRepo(repo.repoName)}
                aria-pressed={isActive}
                aria-label={author_repo_list_select_repository({
                  repository: `${repo.repoOwner}/${repo.repoName}`,
                })}
              >
                <div className="font-display truncate text-lg font-normal">{repo.repoName}</div>
                <div className="text-muted-foreground mt-1 font-mono text-[10px] tracking-[.14em] uppercase">
                  {author_repo_list_skill_count({ count: String(repo.skillCount) })}
                </div>
              </button>
              <a
                href={`https://github.com/${repo.nameWithOwner}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground flex shrink-0 items-center justify-center self-start px-1 transition-colors"
                aria-label={author_repo_list_open_on_github({ repository: repo.nameWithOwner })}
              >
                <GithubLogoIcon className="size-4 opacity-60" />
              </a>
            </div>
          );
        })}

        {repos.length === 0 ? (
          <p className="text-muted-foreground font-serif italic">{author_repo_list_empty()}</p>
        ) : null}
      </div>
    </aside>
  );
};
