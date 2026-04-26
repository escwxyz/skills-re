"use client";

import { useEffect, useState } from "react";
import type { BrowseCategoryItem, BrowseTagItem } from "@/lib/registry-data";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { FadersHorizontalIcon } from "@phosphor-icons/react";

interface TriggerProps {
  onClick: () => void;
  activeCount?: number;
  className?: string;
}

export function SkillFiltersMobileTrigger({ onClick, activeCount = 0, className }: TriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 font-mono text-[11px] tracking-[0.14em] uppercase cursor-pointer",
        className,
      )}
    >
      <FadersHorizontalIcon />
      {activeCount > 0 ? (
        <span className="flex size-4 items-center justify-center rounded-full bg-foreground text-[9px] text-background">
          {activeCount}
        </span>
      ) : null}
    </button>
  );
}

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeClass: string;
  activeTags: Set<string>;
  categories: BrowseCategoryItem[];
  tags: BrowseTagItem[];
  onApply: (activeClass: string, activeTags: Set<string>) => void;
}

export function SkillFiltersMobileDrawer({
  open,
  onOpenChange,
  activeClass,
  activeTags,
  categories,
  tags,
  onApply,
}: DrawerProps) {
  const [draftClass, setDraftClass] = useState(activeClass);
  const [draftTags, setDraftTags] = useState<Set<string>>(new Set(activeTags));

  useEffect(() => {
    if (!open) {
      setDraftClass(activeClass);
      setDraftTags(new Set(activeTags));
    }
  }, [activeClass, activeTags, open]);

  const toggleDraftTag = (tag: string) => {
    setDraftTags((previous) => {
      const next = new Set(previous);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const apply = () => {
    onApply(draftClass, draftTags);
    onOpenChange(false);
  };

  const reset = () => {
    setDraftClass("all");
    setDraftTags(new Set());
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            Filters
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Filter skills by classification and tags
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b border-rule px-5 pb-4.5">
            <p className="mb-3 border-b border-rule py-3 font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
              Classification
            </p>
            {categories.map((item) => (
              <label
                key={item.id}
                className={`flex justify-between py-1 font-mono text-[11.5px] normal-case tracking-normal cursor-pointer ${
                  draftClass === item.id ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draftClass === item.id}
                    onChange={() => setDraftClass(draftClass === item.id ? "all" : item.id)}
                  />
                  {item.title}
                </span>
                <span className="text-muted-foreground">{item.countLabel}</span>
              </label>
            ))}
          </div>

          <div className="px-5 pb-4.5">
            <p className="mb-3 border-b border-rule py-3 font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
              Tags
            </p>
            <div className="flex flex-wrap gap-1.25">
              {tags.map((tag) => (
                <button
                  key={tag.slug}
                  type="button"
                  onClick={() => toggleDraftTag(tag.slug)}
                  className={`border border-rule px-1.75 py-0.75 font-mono text-[10px] tracking-[0.08em] uppercase cursor-pointer ${
                    draftTags.has(tag.slug)
                      ? "bg-foreground text-background"
                      : "bg-transparent text-foreground"
                  }`}
                >
                  {tag.slug}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DrawerFooter>
          <Button onClick={apply}>Done</Button>
          <Button variant="outline" onClick={reset}>
            Reset
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
