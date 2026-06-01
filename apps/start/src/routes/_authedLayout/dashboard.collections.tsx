import { BookmarkSimpleIcon, FolderSimpleIcon, PlusIcon } from "@phosphor-icons/react";
import { useAppForm } from "@/hooks/form-hook";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useRouteContext } from "@tanstack/react-router";
import { z } from "zod/v4";

import { DashboardSkillCard } from "@/components/dashboard-skill-card";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel, Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDashboardCollections } from "@/functions/dashboard/get-dashboard-collections";
import { createSeo } from "@/lib/seo";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

type CollectionVisibility = "public" | "private";
const collectionEditorSchema = z.object({
  slug: z.string().trim().min(1),
  title: z.string().trim().min(1),
  visibility: z.enum(["public", "private"]),
});
const createCollectionSchema = collectionEditorSchema;

interface DashboardCollectionItem {
  description: string;
  id: string;
  kind?: "custom" | "default";
  publicPath?: string;
  skillCount: number;
  slug: string;
  title: string;
  visibility?: CollectionVisibility;
}

export const Route = createFileRoute("/_authedLayout/dashboard/collections")({
  loader: async () => await getDashboardCollections(),
  ssr: "data-only",
  component: RouteComponent,
  head: () =>
    createSeo({
      canonicalPath: "/dashboard/collections",
      locale: getLocale(),
      noIndex: true,
      title: "Collections",
    }),
});

function RouteComponent() {
  const data = Route.useLoaderData();

  const { currentUser } = useRouteContext({ from: "/_authedLayout/dashboard" });
  const queryClient = useQueryClient();

  const collectionsQuery = useQuery({
    ...orpc.collections.listMine.queryOptions(),
    initialData: data.collections,
  });

  const createCollection = useMutation(
    orpc.collections.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.collections.listMine.key() });
      },
    }),
  );

  if (!currentUser) {
    return null;
  }

  const collections = collectionsQuery.data ?? data.collections;
  const defaultCollection =
    data.defaultCollection ?? collections.find((collection) => collection.kind === "default");
  const customCollections = collections.filter((collection) => collection.kind !== "default");

  return (
    <section className="p-4 md:p-6">
      <div className="mb-1 font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
        {m.dashboard_collections_eyebrow()}
      </div>
      <h2 className="font-display text-[1.6rem] leading-[0.96] tracking-[-0.03em]">
        {m.dashboard_collections_title()}
      </h2>
      <p className="mt-2 max-w-2xl text-[13px] leading-[1.6] text-muted-foreground">
        {m.dashboard_collections_description()}
      </p>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <section className="border border-border">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h3 className="font-display text-[1.2rem] leading-none">
                  {defaultCollection?.title ?? m.dashboard_collections_default_title()}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {m.dashboard_collections_default_description()}
                </p>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {defaultCollection?.visibility === "public"
                  ? m.dashboard_collections_visibility_public()
                  : m.dashboard_collections_visibility_private()}
              </span>
            </div>

            {data.defaultCollection?.skills.length ? (
              <div className="grid gap-4 p-4 md:grid-cols-2">
                {data.defaultCollection.skills.map((skill) => (
                  <DashboardSkillCard key={skill.id} skill={skill} />
                ))}
              </div>
            ) : (
              <div className="px-5 py-12 text-center">
                <BookmarkSimpleIcon className="mx-auto size-7 text-muted-foreground/60" />
                <p className="mt-4 font-display text-[1.35rem] leading-none tracking-[-0.03em]">
                  {m.dashboard_collections_empty_default_title()}
                </p>
                <p className="mx-auto mt-3 max-w-md text-[13px] leading-[1.6] text-muted-foreground">
                  {m.dashboard_collections_empty_default_description()}
                </p>
              </div>
            )}
          </section>

          <section className="mt-6 border border-border">
            <div className="border-b border-border px-4 py-3">
              <h3 className="font-display text-[1.2rem] leading-none">
                {m.dashboard_collections_custom_title()}
              </h3>
            </div>
            <div className="divide-y divide-border">
              {customCollections.length > 0 ? (
                customCollections.map((collection) => (
                  <CollectionEditor key={collection.id} collection={collection} />
                ))
              ) : (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                  {m.dashboard_collections_empty_custom()}
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="border border-border p-4">
          <h3 className="font-display text-[1.1rem] leading-none">
            {m.dashboard_collections_create_title()}
          </h3>
          <CreateCollectionForm
            isPending={createCollection.isPending}
            onCreate={async (input) => {
              await createCollection.mutateAsync(input);
            }}
          />
        </aside>
      </div>
    </section>
  );
}

function CollectionEditor({ collection }: { collection: DashboardCollectionItem }) {
  const queryClient = useQueryClient();

  const updateCollection = useMutation(
    orpc.collections.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.collections.listMine.key() });
      },
    }),
  );

  const form = useAppForm({
    defaultValues: {
      slug: collection.slug,
      title: collection.title,
      visibility: (collection.visibility ?? "private") as CollectionVisibility,
    },
    onSubmit: async ({ value }) => {
      await updateCollection.mutateAsync({
        id: collection.id,
        slug: value.slug.trim(),
        title: value.title.trim(),
        visibility: value.visibility,
      });
    },
    validators: {
      onSubmit: collectionEditorSchema,
    },
  });

  return (
    <form.AppForm>
      <Form className="grid gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FolderSimpleIcon className="size-4 text-muted-foreground" />
              <span className="font-display text-[1rem] leading-none">{collection.title}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {m.dashboard_collections_skill_count({ count: collection.skillCount })}
            </p>
          </div>
          {collection.visibility === "public" && collection.publicPath ? (
            <Button
              variant="outline"
              size="xs"
              render={<Link to="/collections/$slug" params={{ slug: collection.publicPath }} />}
            >
              {m.dashboard_collections_open_public()}
            </Button>
          ) : null}
        </div>
        <div className="grid gap-2 md:grid-cols-[1fr_1fr_132px_auto]">
          <form.AppField name="title">
            {(field) => (
              <Field>
                <FieldLabel className="sr-only">{m.dashboard_collections_name_label()}</FieldLabel>
                <Input
                  aria-label={m.dashboard_collections_name_label()}
                  onChange={(event) => field.handleChange(event.target.value)}
                  value={field.state.value}
                />
                <FieldError />
              </Field>
            )}
          </form.AppField>
          <form.AppField name="slug">
            {(field) => (
              <Field>
                <FieldLabel className="sr-only">{m.dashboard_collections_slug_label()}</FieldLabel>
                <Input
                  aria-label={m.dashboard_collections_slug_label()}
                  onChange={(event) => field.handleChange(event.target.value)}
                  value={field.state.value}
                />
                <FieldError />
              </Field>
            )}
          </form.AppField>
          <form.AppField name="visibility">
            {(field) => (
              <Field>
                <FieldLabel className="sr-only">
                  {m.dashboard_collections_visibility_label()}
                </FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value as CollectionVisibility)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">
                      {m.dashboard_collections_visibility_private()}
                    </SelectItem>
                    <SelectItem value="public">
                      {m.dashboard_collections_visibility_public()}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FieldError />
              </Field>
            )}
          </form.AppField>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button type="submit" size="sm" disabled={!canSubmit || isSubmitting}>
                {m.dashboard_collections_save_changes()}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </Form>
    </form.AppForm>
  );
}

function CreateCollectionForm({
  isPending,
  onCreate,
}: {
  isPending: boolean;
  onCreate: (input: {
    description: string;
    slug: string;
    title: string;
    visibility: CollectionVisibility;
  }) => Promise<void>;
}) {
  const form = useAppForm({
    defaultValues: {
      slug: "",
      title: "",
      visibility: "private" as CollectionVisibility,
    },
    onSubmit: async ({ value }) => {
      const normalizedTitle = value.title.trim();
      const normalizedSlug = value.slug.trim();
      await onCreate({
        description: m.dashboard_collections_custom_description({ title: normalizedTitle }),
        slug: normalizedSlug,
        title: normalizedTitle,
        visibility: value.visibility,
      });
      form.reset({
        slug: "",
        title: "",
        visibility: "private",
      });
    },
    validators: {
      onSubmit: createCollectionSchema,
    },
  });

  return (
    <form.AppForm>
      <Form className="mt-4 grid gap-3">
        <form.AppField name="title">
          {(field) => (
            <Field>
              <FieldLabel className="sr-only">{m.dashboard_collections_name_label()}</FieldLabel>
              <Input
                aria-label={m.dashboard_collections_name_label()}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder={m.dashboard_collections_name_label()}
                value={field.state.value}
              />
              <FieldError />
            </Field>
          )}
        </form.AppField>
        <form.AppField name="slug">
          {(field) => (
            <Field>
              <FieldLabel className="sr-only">{m.dashboard_collections_slug_label()}</FieldLabel>
              <Input
                aria-label={m.dashboard_collections_slug_label()}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder={m.dashboard_collections_slug_label()}
                value={field.state.value}
              />
              <FieldError />
            </Field>
          )}
        </form.AppField>
        <form.AppField name="visibility">
          {(field) => (
            <Field>
              <FieldLabel className="sr-only">
                {m.dashboard_collections_visibility_label()}
              </FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value as CollectionVisibility)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">
                    {m.dashboard_collections_visibility_private()}
                  </SelectItem>
                  <SelectItem value="public">
                    {m.dashboard_collections_visibility_public()}
                  </SelectItem>
                </SelectContent>
              </Select>
              <FieldError />
            </Field>
          )}
        </form.AppField>
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={isPending || !canSubmit || isSubmitting}>
              <PlusIcon className="size-3.5" />
              {m.dashboard_collections_create_submit()}
            </Button>
          )}
        </form.Subscribe>
      </Form>
    </form.AppForm>
  );
}
