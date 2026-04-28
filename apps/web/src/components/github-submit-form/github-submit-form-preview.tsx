import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { RepoPreview } from "./github-submit-form.types";

interface GithubSubmitFormPreviewProps {
  clearLabel: ReactNode;
  branchLabel: ReactNode;
  invalidSkillsLabel: ReactNode;
  onClearSelectedSkills: () => void;
  onToggleSkillSelection: (skillRootPath: string) => void;
  onSelectAllSkills: () => void;
  previewLabel: ReactNode;
  publishableSkillsLabel: ReactNode;
  repoPreview: RepoPreview;
  rootPathFallback: string;
  selectAllLabel: ReactNode;
  selectSkillsLabel: ReactNode;
  selectedSkillRootPaths: string[];
  skippedInvalidSkillsLabel: ReactNode;
  skillTitleFallback: ReactNode;
}

export function GithubSubmitFormPreview({
  clearLabel,
  branchLabel,
  invalidSkillsLabel,
  onClearSelectedSkills,
  onToggleSkillSelection,
  onSelectAllSkills,
  previewLabel,
  publishableSkillsLabel,
  repoPreview,
  rootPathFallback,
  selectAllLabel,
  selectSkillsLabel,
  selectedSkillRootPaths,
  skippedInvalidSkillsLabel,
  skillTitleFallback,
}: GithubSubmitFormPreviewProps) {
  return (
    <div className="mb-7 space-y-4">
      <div className="space-y-1 border border-rule bg-paper-2 p-4">
        <p className="font-mono text-[10px] tracking-[.14em] uppercase text-muted-text">
          {previewLabel}
        </p>
        <p className="font-mono text-[13px] text-ink">
          {repoPreview.owner}/{repoPreview.repo}
        </p>
        <p className="font-mono text-[11px] text-muted-text">
          {branchLabel} {repoPreview.branch}
        </p>
        <p className="font-mono text-[11px] text-muted-text">
          {publishableSkillsLabel} {repoPreview.skills.length}
        </p>
        {repoPreview.invalidSkills.length > 0 && (
          <p className="font-mono text-[11px] text-muted-text">
            {skippedInvalidSkillsLabel} {repoPreview.invalidSkills.length}
          </p>
        )}
      </div>

      <div>
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <div className="font-mono text-[10.5px] tracking-[.14em] uppercase text-muted-text">
            {selectSkillsLabel}
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onSelectAllSkills}
              className="cursor-pointer border border-rule px-2.5 py-1 font-mono text-[10px] tracking-widest uppercase text-ink hover:bg-paper-2"
            >
              {selectAllLabel}
            </button>
            <button
              type="button"
              onClick={onClearSelectedSkills}
              className="cursor-pointer border border-rule px-2.5 py-1 font-mono text-[10px] tracking-widest uppercase text-ink hover:bg-paper-2"
            >
              {clearLabel}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {repoPreview.skills.map((skill) => {
            const isSelected = selectedSkillRootPaths.includes(skill.skillRootPath);

            return (
              <div
                key={skill.skillMdPath}
                className={cn(
                  "rounded border p-3 transition-colors",
                  isSelected ? "border-editorial-green bg-paper-2" : "border-rule bg-paper",
                )}
              >
                <label className="mb-3 flex cursor-pointer items-start gap-3">
                  <input
                    checked={isSelected}
                    className="mt-0.5 size-4 accent-current"
                    onChange={() => onToggleSkillSelection(skill.skillRootPath)}
                    type="checkbox"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] tracking-[.14em] uppercase text-muted-text">
                      {skill.skillRootPath || rootPathFallback}
                    </p>
                    <p className="font-mono text-[13px] text-ink">
                      {skill.skillTitle || skillTitleFallback}
                    </p>
                    <p className="truncate font-mono text-[11px] text-muted-text">
                      {skill.skillMdPath}
                    </p>
                  </div>
                </label>
                {skill.skillDescription && (
                  <p className="text-[12px] leading-relaxed text-ink-2">{skill.skillDescription}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {repoPreview.invalidSkills.length > 0 && (
        <div>
          <p className="mb-2.5 font-mono text-[10.5px] tracking-[.14em] uppercase text-muted-text">
            {invalidSkillsLabel}
          </p>
          <div className="space-y-2">
            {repoPreview.invalidSkills.map((skill) => (
              <div
                key={skill.skillMdPath}
                className="rounded border border-editorial-red/30 bg-paper-2 p-3"
              >
                <p className="font-mono text-[11px] text-ink">{skill.skillMdPath}</p>
                <p className="font-mono text-[10px] tracking-[.14em] uppercase text-muted-text">
                  {skill.skillRootPath}
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-ink-2">{skill.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
