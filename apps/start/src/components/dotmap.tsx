import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import { DotMapP5 } from "@/components/canvas";
import { useTheme } from "@/lib/theme";

export const DotMap = ({ className, imageSrc }: { className?: string; imageSrc: string }) => {
  const { resolved } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dotTheme = useMemo(
    () =>
      resolved === "dark"
        ? {
            bg: "#191a19",
            dot: "#ffffff",
            invert: true,
          }
        : {
            bg: "#ffffff",
            dot: "#191a19",
            invert: false,
          },
    [resolved],
  );

  if (!mounted) {
    return <div aria-hidden className={cn("h-full w-full bg-background", className)} />;
  }

  return <DotMapP5 className={className} fitParent={false} imageSrc={imageSrc} theme={dotTheme} />;
};
