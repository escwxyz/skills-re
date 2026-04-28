import type { ReactNode } from "react";

interface GithubSubmitFormHeaderProps {
  description: ReactNode;
  title: ReactNode;
}

export function GithubSubmitFormHeader({ description, title }: GithubSubmitFormHeaderProps) {
  return (
    <>
      <h3 className="font-display mb-4.5 border-b border-rule pb-2.5 text-3xl font-normal">
        {title}
      </h3>

      <p className="font-serif mb-7 max-w-160 text-sm leading-relaxed text-ink-2">{description}</p>
    </>
  );
}
