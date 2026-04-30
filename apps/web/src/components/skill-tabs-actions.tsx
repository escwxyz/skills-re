import { DownloadSimpleIcon, PackageIcon, UserPlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

const BUTTON_VARIANTS = [
  {
    label: "Download archive",
    icon: DownloadSimpleIcon,
  },
  {
    label: "Sign in to claim as author",
    icon: UserPlusIcon,
  },
  {
    label: "Install",
    icon: PackageIcon,
  },
] as const;

export const SkillTabsActions = () => (
  <div className="flex flex-1 items-center justify-end px-3">
    <div className="flex items-center justify-end gap-1.5">
      {BUTTON_VARIANTS.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.label}
            aria-label={action.label}
            className="cursor-pointer"
            size="icon-sm"
            type="button"
            title={action.label}
            variant="outline"
          >
            <Icon aria-hidden className="size-4" />
          </Button>
        );
      })}
    </div>
  </div>
);
