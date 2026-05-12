import type { ReactNode } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { downloadSkillArchive } from "@/functions/skills/download-skill-archive";
import { cn } from "@/lib/utils";

interface Props {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  snapshotId: string | null;
  size?: "lg" | "icon-sm";
  title: string;
}

export const SkillArchiveDownloadButton = ({
  ariaLabel,
  children,
  className,
  snapshotId,
  size = "lg",
  title,
}: Props) => {
  if (!snapshotId) {
    return (
      <span
        aria-disabled="true"
        aria-label={ariaLabel}
        className={cn(buttonVariants({ size, variant: "outline" }), className)}
        title={title}
      >
        {children}
      </span>
    );
  }

  return (
    <form action={downloadSkillArchive.url} method="post">
      <input name="snapshotId" type="hidden" value={snapshotId} />
      <Button
        aria-label={ariaLabel}
        className={className}
        size={size}
        title={title}
        type="submit"
        variant="outline"
      >
        {children}
      </Button>
    </form>
  );
};
