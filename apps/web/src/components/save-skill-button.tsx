"use client";

import { useStore } from "@nanostores/react";
import { useState } from "react";

import { m } from "@/paraglide/messages";
import { isAuthenticatedAtom, isLoginDialogOpenAtom } from "@/stores/app";
import { orpc } from "@/lib/orpc";

interface Props {
  slug: string;
}

export const SaveSkillButton = ({ slug }: Props) => {
  const isAuthenticated = useStore(isAuthenticatedAtom);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  let buttonLabel = m.skill_actions_sign_in_to_save_skill();

  if (isAuthenticated) {
    buttonLabel = m.skill_actions_save_skill();
  }

  if (saved) {
    buttonLabel = m.skill_actions_saved_skill();
  }

  if (pending) {
    buttonLabel = m.skill_actions_saving_skill();
  }

  const handleClick = async () => {
    if (!isAuthenticated) {
      isLoginDialogOpenAtom.set(true);
      return;
    }

    setPending(true);
    setError(null);

    try {
      const result = await orpc.skills.save({ slug });
      setSaved(result.saved || result.alreadySaved);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : m.skill_actions_save_failed_fallback(),
      );
    } finally {
      setPending(false);
    }
  };

  if (saved) {
    return (
      <div className="border border-rule px-4 py-[11px] text-center font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-text">
        {m.skill_actions_saved_notice()}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex w-full items-center justify-center border border-ink bg-ink px-4 py-[11px] font-mono text-[10.5px] uppercase tracking-[0.12em] text-paper transition-opacity disabled:cursor-default disabled:opacity-60"
      >
        {buttonLabel}
      </button>
      {error && (
        <p className="m-0 font-mono text-[10px] tracking-[0.1em] text-editorial-red">{error}</p>
      )}
    </div>
  );
};
