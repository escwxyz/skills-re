import { useSaveSkill } from "@/hooks/use-save-skill";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import { BookmarkSimpleIcon, CaretDownIcon, FolderSimplePlusIcon } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { memo, useState } from "react";

export const SaveSkillButton = memo(
  ({ slug, compact = false }: { slug: string; compact?: boolean }) => {
    const { currentUser } = useRouteContext({ from: "__root__" });
    const queryClient = useQueryClient();
    const { isSaved, handleClick, isSavingToCollection, saveToCollection } = useSaveSkill({ slug });
    const [open, setOpen] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState("");
    const [visibility, setVisibility] = useState<"public" | "private">("private");

    const collectionsQuery = useQuery({
      ...orpc.collections.listMine.queryOptions(),
      enabled: Boolean(currentUser) && open,
    });

    const renderLabel = () => {
      if (compact) {
        return null;
      }

      if (isSaved) {
        return m.skill_actions_saved_skill();
      }

      return m.skill_actions_save_skill();
    };

    if (compact) {
      return (
        <Button
          aria-label={m.skill_actions_save_skill()}
          title={m.skill_actions_save_skill()}
          size="icon-sm"
          variant="ghost"
          onClick={handleClick}
          className="w-full max-w-md"
        >
          <BookmarkSimpleIcon
            aria-hidden
            className="size-4"
            weight={isSaved ? "fill" : "regular"}
          />
        </Button>
      );
    }

    const handleOpenChange = (nextOpen: boolean) => {
      if (nextOpen && !currentUser) {
        handleClick();
        return;
      }
      setOpen(nextOpen);
    };

    const saveExistingCollection = async (collectionId: string) => {
      await saveToCollection({
        collectionId,
        visibility,
      });
      await queryClient.invalidateQueries({ queryKey: orpc.collections.listMine.key() });
      setOpen(false);
    };

    const saveNewCollection = async () => {
      const title = newCollectionName.trim();
      if (!title) {
        return;
      }
      await saveToCollection({
        newCollection: {
          title,
          visibility,
        },
      });
      setNewCollectionName("");
      await queryClient.invalidateQueries({ queryKey: orpc.collections.listMine.key() });
      setOpen(false);
    };

    return (
      <div className="w-full max-w-md">
        <div className="flex w-full">
          <Button
            aria-label={m.skill_actions_save_skill()}
            title={m.skill_actions_default_collection_hint()}
            size="lg"
            variant="secondary"
            onClick={handleClick}
            className="min-w-0 flex-1"
          >
            <BookmarkSimpleIcon
              aria-hidden
              className="size-4"
              weight={isSaved ? "fill" : "regular"}
            />
            {renderLabel()}
          </Button>
          <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger
              render={
                <Button
                  aria-label={m.skill_actions_choose_collection()}
                  title={m.skill_actions_choose_collection()}
                  size="icon-lg"
                  variant="secondary"
                  className="border-l border-background/60"
                >
                  <CaretDownIcon className="size-4" />
                </Button>
              }
            />
            <PopoverContent align="end" className="w-96 gap-3 p-0">
              <div className="border-b px-4 py-3">
                <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground">
                  {m.skill_actions_collection_picker_title()}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {m.skill_actions_default_collection_hint()}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 px-4">
                <span className="text-xs text-muted-foreground">
                  {m.skill_actions_collection_visibility_label()}
                </span>
                <Select
                  value={visibility}
                  onValueChange={(value) => setVisibility(value as "public" | "private")}
                >
                  <SelectTrigger size="sm" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">
                      {m.skill_actions_collection_visibility_private()}
                    </SelectItem>
                    <SelectItem value="public">
                      {m.skill_actions_collection_visibility_public()}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Command className="px-2">
                <CommandInput placeholder={m.skill_actions_collection_search_placeholder()} />
                <CommandList>
                  <CommandEmpty>{m.skill_actions_collection_empty()}</CommandEmpty>
                  <CommandGroup>
                    {(collectionsQuery.data ?? []).map((collection) => (
                      <CommandItem
                        key={collection.id}
                        value={`${collection.title} ${collection.slug}`}
                        onSelect={() => {
                          void saveExistingCollection(collection.id);
                        }}
                      >
                        <BookmarkSimpleIcon className="size-3.5" />
                        <span className="min-w-0 flex-1 truncate">{collection.title}</span>
                        <span className="font-mono text-[10px] uppercase text-muted-foreground">
                          {collection.visibility === "public"
                            ? m.skill_actions_collection_visibility_public()
                            : m.skill_actions_collection_visibility_private()}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
              <div className="border-t p-3">
                <label
                  htmlFor={`new-collection-${slug}`}
                  className="mb-2 block text-xs text-muted-foreground"
                >
                  {m.skill_actions_new_collection_label()}
                </label>
                <div className="flex gap-2">
                  <Input
                    id={`new-collection-${slug}`}
                    value={newCollectionName}
                    onChange={(event) => setNewCollectionName(event.target.value)}
                    placeholder={m.skill_actions_new_collection_placeholder()}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      void saveNewCollection();
                    }}
                    disabled={isSavingToCollection || !newCollectionName.trim()}
                  >
                    <FolderSimplePlusIcon className="size-3.5" />
                    {m.skill_actions_new_collection_save()}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {m.skill_actions_default_collection_hint()}
        </p>
      </div>
    );
  },
);
