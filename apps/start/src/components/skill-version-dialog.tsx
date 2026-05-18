// oxlint-disable no-nested-ternary
"use client";

import { CaretDownIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  skill_detail_meta_version,
  skill_version_current_badge,
  skill_version_selected,
  skill_version_switch_button,
} from "@/paraglide/messages";
import { cn } from "@/lib/utils";
import type { SkillVersionHistoryItem } from "@/utils/types";
import { TimeValue } from "@/components/time-value";
import { getLocale } from "@/paraglide/runtime";

interface Props {
  onSnapshotChange: (snapshotId: string) => void;
  selectedSnapshotId: string | null;
  versions: SkillVersionHistoryItem[];
  triggerClassName?: string;
}

const getSelectedVersion = (
  versions: SkillVersionHistoryItem[],
  selectedSnapshotId: string | null,
) => versions.find((version) => version.snapshotId === selectedSnapshotId) ?? versions[0] ?? null;

export const SkillVersionDialog = ({
  onSnapshotChange,
  selectedSnapshotId,
  triggerClassName,
  versions,
}: Props) => {
  const [open, setOpen] = useState(false);
  const currentVersion = useMemo(
    () => getSelectedVersion(versions, selectedSnapshotId),
    [selectedSnapshotId, versions],
  );
  const [pendingSnapshotId, setPendingSnapshotId] = useState<string | null>(
    currentVersion?.snapshotId ?? versions[0]?.snapshotId ?? null,
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setPendingSnapshotId(currentVersion?.snapshotId ?? versions[0]?.snapshotId ?? null);
  }, [currentVersion?.snapshotId, open, versions]);

  const canSwitch =
    pendingSnapshotId !== null &&
    currentVersion !== null &&
    pendingSnapshotId !== currentVersion.snapshotId;

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        className={cn(
          "border-border hover:bg-muted flex items-center justify-between gap-3 border px-4 py-3 text-left transition-colors",
          triggerClassName,
        )}
      >
        <span className="font-mono text-[10px] uppercase tracking-[.14em] text-foreground">
          {skill_version_switch_button()}
        </span>
        <CaretDownIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </DialogTrigger>

      <DialogContent showCloseButton={false} className="w-[min(96vw,38rem)] max-w-none p-0">
        <DialogHeader className="border-border border-b px-5 py-4">
          <div className="flex items-baseline justify-between gap-4">
            <DialogTitle className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">
              {skill_detail_meta_version()}
            </DialogTitle>
            <span className="font-mono text-[10px] uppercase tracking-[.12em] text-muted-foreground">
              {currentVersion ? `v.${currentVersion.version}` : "—"}
              {currentVersion?.label === "current" ? ` · ${skill_version_current_badge()}` : ""}
            </span>
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-auto">
          <ul>
            {versions.map((version) => {
              const isCurrent = version.snapshotId === currentVersion?.snapshotId;
              const isPending = version.snapshotId === pendingSnapshotId;

              return (
                <li key={version.snapshotId} className="border-border border-b last:border-b-0">
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors",
                      isPending ? "bg-muted" : "hover:bg-muted",
                    )}
                    aria-pressed={isPending}
                    onClick={() => setPendingSnapshotId(version.snapshotId)}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-mono text-[11px] uppercase tracking-[.08em] text-foreground">
                        v.{version.version}
                        {isCurrent ? ` · ${skill_version_current_badge()}` : ""}
                      </span>
                      <span className="truncate font-mono text-[10px] text-muted-foreground">
                        <TimeValue locale={getLocale()} time={version.date} />
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
                      {isPending
                        ? skill_version_selected()
                        : isCurrent
                          ? skill_version_current_badge()
                          : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="border-border flex items-center justify-end gap-4 border-t px-5 py-4">
          <button
            type="button"
            className="border-border bg-background hover:bg-muted disabled:text-muted-foreground disabled:hover:bg-background border px-4 py-2 font-mono text-[10px] uppercase tracking-[.14em] transition-colors disabled:cursor-not-allowed"
            disabled={!canSwitch}
            onClick={() => {
              if (!pendingSnapshotId || !canSwitch) {
                return;
              }

              onSnapshotChange(pendingSnapshotId);
              setOpen(false);
            }}
          >
            {skill_version_switch_button()}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
