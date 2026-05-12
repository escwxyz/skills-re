import { useEffect, useState } from "react";
import { ArrowUpIcon } from "@phosphor-icons/react";

export const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsVisible(window.scrollY > 400);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <button
      aria-label="Scroll to top"
      className="fixed right-6 bottom-6 z-40 flex size-10 items-center justify-center rounded-none border bg-card font-mono text-foreground text-xs transition-colors hover:border-foreground hover:text-foreground max-sm:right-auto max-sm:left-1/2 max-sm:-translate-x-1/2"
      onClick={() => {
        window.scrollTo({ behavior: "smooth", top: 0 });
      }}
      type="button"
    >
      <ArrowUpIcon />
    </button>
  );
};
