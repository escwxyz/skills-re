"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { XIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NormalizedSkillsBrowseFilters, SkillsBrowseMetaData } from "@/utils/browse";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { formatInteger } from "@/utils/format";
import { cn } from "@/lib/utils";
import { ResetFiltersButton } from "@/components/reset-filters-button";

const COLLAPSED_TAG_LIMIT = 12;

interface Props {
  categories: SkillsBrowseMetaData["categories"];
  isMobile: boolean;
  filters: NormalizedSkillsBrowseFilters;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  tags: SkillsBrowseMetaData["tags"];
}

const makeBrowseSearch = (
  filters: NormalizedSkillsBrowseFilters,
  patch: Partial<{
    activeClass: string;
    query: string;
    sort: NormalizedSkillsBrowseFilters["sort"];
    tags: string[];
  }>,
) => {
  const activeClass = patch.activeClass ?? filters.activeClass;
  const query = patch.query ?? filters.query;
  const sort = patch.sort ?? filters.sort;
  const tags = patch.tags ?? filters.tags;

  return {
    ...(activeClass === "all" ? {} : { category: activeClass }),
    ...(query ? { q: query } : {}),
    ...(sort ? { sort } : {}),
    ...(tags.length > 0 ? { tag: tags } : {}),
  };
};

const BrowseFilterGroup = ({ children, label }: { children: ReactNode; label: string }) => (
  <motion.section layout className="border-border border-b px-5 py-4.5">
    <div className="mb-3 font-mono text-[10.5px] tracking-[.18em] uppercase text-muted-foreground">
      {label}
    </div>
    {children}
  </motion.section>
);

const BrowseFilterLinks = ({
  categories,
  closeDrawer,
  filters,
}: Pick<Props, "categories" | "filters"> & { closeDrawer?: () => void }) => (
  <BrowseFilterGroup label={m.skills_browse_categories_label()}>
    <div className="flex flex-col gap-0.5">
      {categories.map((item) => {
        const isActive = filters.activeClass === item.slug;

        return (
          <Link
            key={item.slug}
            to="/skills"
            search={makeBrowseSearch(filters, {
              activeClass: isActive ? "all" : item.slug,
            })}
            onClick={closeDrawer}
            className={cn(
              "flex justify-between py-1 font-mono text-[11.5px] tracking-normal normal-case no-underline",
              isActive ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span>{item.name}</span>
            <span className="text-muted-foreground">{formatInteger(item.count, getLocale())}</span>
          </Link>
        );
      })}
    </div>
  </BrowseFilterGroup>
);

const BrowseFilterTags = ({
  closeDrawer,
  filters,
  tags,
}: Pick<Props, "filters" | "tags"> & { closeDrawer?: () => void }) => {
  const locale = getLocale();
  const [isExpanded, setIsExpanded] = useState(false);
  const canExpand = tags.length > COLLAPSED_TAG_LIMIT;
  const visibleTags = isExpanded ? tags : tags.slice(0, COLLAPSED_TAG_LIMIT);

  const renderTags = () => (
    <div className="flex flex-wrap gap-1.25">
      {visibleTags.map((tag) => {
        const isActive = filters.tags.includes(tag.slug);
        const nextTags = isActive
          ? filters.tags.filter((value) => value !== tag.slug)
          : [...filters.tags, tag.slug].toSorted();

        return (
          <Link
            key={tag.slug}
            to="/skills"
            search={makeBrowseSearch(filters, { tags: nextTags })}
            onClick={closeDrawer}
            className={cn(
              "border-border border px-1.75 py-0.75 font-mono text-[10px] tracking-[.08em] uppercase no-underline",
              isActive ? "bg-foreground text-background" : "bg-transparent text-foreground",
            )}
          >
            {tag.slug} · {formatInteger(tag.count, locale)}
          </Link>
        );
      })}
    </div>
  );

  return (
    <BrowseFilterGroup label={m.skills_browse_tags_label()}>
      <div className="space-y-3">
        {isExpanded && canExpand ? (
          <ScrollArea className="h-56">{renderTags()}</ScrollArea>
        ) : (
          renderTags()
        )}

        <div className="flex flex-wrap items-center gap-3">
          {canExpand ? (
            <Button
              className="h-7 px-2 font-mono text-[10px] tracking-[.08em] uppercase text-muted-foreground"
              onClick={() => setIsExpanded((prev) => !prev)}
              size="sm"
              type="button"
              variant="ghost"
            >
              {isExpanded ? m.skills_browse_tags_show_less() : m.skills_browse_tags_show_more()}
            </Button>
          ) : null}

          <Link
            className="font-mono text-[10px] tracking-[.08em] uppercase text-muted-foreground transition-colors hover:text-foreground"
            onClick={closeDrawer}
            to="/tags"
          >
            {m.skills_browse_tags_view_all()}
          </Link>
        </div>
      </div>
    </BrowseFilterGroup>
  );
};

const BrowseFilterBody = ({
  categories,
  closeDrawer,
  filters,
  tags,
}: Pick<Props, "categories" | "filters" | "tags"> & {
  closeDrawer?: () => void;
}) => (
  <div className="min-h-0 flex-1 overflow-y-auto">
    <BrowseFilterLinks categories={categories} closeDrawer={closeDrawer} filters={filters} />
    <BrowseFilterTags closeDrawer={closeDrawer} filters={filters} tags={tags} />
  </div>
);

const BrowseFilterHeader = ({
  isMobile,
  onOpenChange,
}: {
  isMobile: boolean;
  onOpenChange: (open: boolean) => void;
}) => (
  <div className="border-border flex h-(--header-height) items-center justify-between border-b px-5">
    {isMobile ? (
      <DrawerTitle className="font-mono text-[10.5px] tracking-[.18em] uppercase text-muted-foreground">
        {m.skills_browse_controls_filters()}
      </DrawerTitle>
    ) : (
      <div className="font-mono text-[10.5px] tracking-[.18em] uppercase text-muted-foreground">
        {m.skills_browse_controls_filters()}
      </div>
    )}
    <div className="flex items-center gap-2">
      <ResetFiltersButton
        className="h-7 px-2"
        onReset={isMobile ? () => onOpenChange(false) : undefined}
      />
      {isMobile ? null : (
        <Button
          aria-label={m.skills_browse_controls_filters()}
          className="text-foreground"
          onClick={() => onOpenChange(false)}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <XIcon />
        </Button>
      )}
    </div>
  </div>
);

export const BrowseFiltersSidebar = ({
  categories,
  filters,
  isMobile,
  onOpenChange,
  open,
  tags,
}: Props) =>
  isMobile ? (
    <Drawer direction="bottom" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="border-border border-t bg-background p-0 text-foreground">
        <DrawerHeader className="p-0">
          <BrowseFilterHeader isMobile onOpenChange={onOpenChange} />
          <DrawerDescription className="sr-only">{m.skills_browse_description()}</DrawerDescription>
        </DrawerHeader>
        <BrowseFilterBody
          categories={categories}
          closeDrawer={() => onOpenChange(false)}
          filters={filters}
          tags={tags}
        />
      </DrawerContent>
    </Drawer>
  ) : (
    <motion.aside
      animate={{ width: open ? "16rem" : "0rem" }}
      className={cn(
        "sticky top-(--header-height) self-start shrink-0 overflow-hidden bg-background",
        open ? "border-r border-border" : "",
      )}
      initial={false}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="max-h-[calc(100svh-var(--header-height))] w-64 overflow-y-auto">
        <BrowseFilterHeader isMobile={false} onOpenChange={onOpenChange} />
        <BrowseFilterBody categories={categories} filters={filters} tags={tags} />
      </div>
    </motion.aside>
  );
