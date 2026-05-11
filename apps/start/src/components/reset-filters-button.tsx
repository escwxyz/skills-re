import { useResetFilters } from "@/hooks/use-reset-filters";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

export const ResetFiltersButton = ({
  className,
  onReset,
}: {
  className?: string;
  onReset?: () => void;
}) => {
  const { resetFilters } = useResetFilters();

  return (
    <Button
      className={cn("text-[10px] text-muted-foreground uppercase hover:text-primary", className)}
      onClick={() => {
        resetFilters();
        onReset?.();
      }}
      variant="outline"
    >
      Reset
    </Button>
  );
};
