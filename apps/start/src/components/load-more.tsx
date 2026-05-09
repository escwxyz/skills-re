"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

export const LoadMore = ({
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: {
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}) => {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasNextPage || !sentinelRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        rootMargin: "600px 0px",
      },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (!hasNextPage) {
    return null;
  }

  return (
    <div ref={sentinelRef} className="border-border flex justify-center border-b py-7.5">
      <Button
        disabled={isFetchingNextPage}
        className="h-9 min-w-40 px-4 font-mono text-[11px] tracking-[.14em] uppercase"
        onClick={() => fetchNextPage()}
        type="button"
        variant="outline"
      >
        {isFetchingNextPage ? m.loading_more() : m.load_more()}
      </Button>
    </div>
  );
};
