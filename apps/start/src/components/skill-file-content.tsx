import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getSkillFileContent } from "@/functions/skills/get-skill-file-content";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { formatInteger } from "@/utils/format";
import { getFileKindLabel } from "@/utils/get-file-kind-lable";

interface Props {
  activePath: string;
  snapshotId: string;
}

export function SkillFileContent({ activePath, snapshotId }: Props) {
  const getContent = useServerFn(getSkillFileContent);
  const locale = getLocale();

  const { data, isLoading } = useQuery({
    queryKey: ["skillFileContent", snapshotId, activePath],
    queryFn: () => getContent({ data: { path: activePath, snapshotId } }),
  });

  if (isLoading) {
    return <FileContentSkeleton path={activePath} />;
  }

  if (!data) {
    return <FileEmptyState />;
  }

  const metaLabel = [
    getFileKindLabel(activePath),
    `${formatInteger(data.totalBytes, locale)} bytes`,
    data.isTruncated ? m.skill_file_tree_content_truncated() : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className="border-border border-b px-5 py-4">
        <div className="font-mono text-[12px] text-ink">{activePath}</div>
        <div className="eyebrow mt-1">{metaLabel}</div>
      </div>
      {data.isTruncated && (
        <div className="border-border bg-paper-2 border-b px-5 py-3 text-sm text-ink-2">
          {m.skill_file_tree_content_truncated_notice()}
        </div>
      )}
      <div className="overflow-x-auto px-5 py-6">
        <article
          className="prose prose-neutral prose-pre:max-w-full prose-pre:overflow-x-auto max-w-none font-serif"
          dangerouslySetInnerHTML={{ __html: data.html }}
        />
      </div>
    </>
  );
}

function FileContentSkeleton({ path }: { path: string }) {
  return (
    <div className="border-border border-b px-5 py-4">
      <div className="font-mono text-[12px] text-ink">{path}</div>
      <div className="bg-paper-2 mt-1 h-2.5 w-32 animate-pulse rounded" />
    </div>
  );
}

export function FileEmptyState() {
  return (
    <div className="px-5 py-8">
      <div className="border-border bg-paper-2 border px-5 py-6">
        <div className="eyebrow text-editorial-red mb-2">§ {m.skill_detail_file_tree()}</div>
        <p className="text-ink-2 m-0 max-w-110">{m.skill_file_tree_content_empty_description()}</p>
      </div>
    </div>
  );
}
