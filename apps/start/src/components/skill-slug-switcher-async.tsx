import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { SkillSlugSwitcher } from "@/components/skill-slug-switcher";
import { getAuthorSkills } from "@/functions/authors/get-author-skills";

interface Props {
  authorHandle: string;
  currentSlug: string;
}

export const SkillSlugSwitcherAsync = ({ authorHandle, currentSlug }: Props) => {
  const getSkills = useServerFn(getAuthorSkills);
  const { data } = useQuery({
    queryKey: ["authorSkills", authorHandle],
    queryFn: () => getSkills({ data: { handle: authorHandle } }),
    select: (skills) => skills.map((s) => ({ slug: s.slug, title: s.title })),
    refetchInterval: 24 * 60 * 60 * 1000,
  });

  return (
    <SkillSlugSwitcher
      currentSlug={currentSlug}
      publisherHandle={authorHandle}
      skills={data ?? []}
    />
  );
};
