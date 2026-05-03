"use client";

import { useEffect } from "react";
import { isLoginDialogOpenAtom } from "@/stores/app";

export const SearchRateLimitPrompt = () => {
  useEffect(() => {
    isLoginDialogOpenAtom.set(true);
  }, []);

  return (
    <div className="px-6 py-12">
      <div className="border-rule bg-paper-2 max-w-120 border px-5 py-6">
        <div className="eyebrow text-destructive mb-2">§ Rate Limited</div>
        <p className="text-ink-2 m-0">
          You&apos;ve reached the search limit for guests. Sign in for unlimited access.
        </p>
      </div>
    </div>
  );
};
