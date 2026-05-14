// oxlint-disable no-nested-ternary
import { useState } from "react";
import { createFileRoute, useRouter, useRouteContext } from "@tanstack/react-router";
import {
  ChatCircleTextIcon,
  CheckIcon,
  MegaphoneIcon,
  PlusIcon,
  SealCheckIcon,
  SpinnerGapIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { z } from "zod/v4";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field as FormField, FieldError, FieldLabel, Form } from "@/components/ui/form";
import {
  Field as LayoutField,
  FieldContent,
  FieldTitle,
  FieldLabel as CardLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { TimeValue } from "@/components/time-value";
import { createSeo } from "@/lib/seo";
import { orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { useAppForm } from "@/hooks/form-hook";
import { getDashboardFeedbacksPageData } from "@/functions/dashboard/get-dashboard-feedbacks-page-data";
import type { DashboardFeedbacksPageData } from "@/functions/dashboard/get-dashboard-feedbacks-page-data";

export const Route = createFileRoute("/_authedLayout/dashboard/feedbacks")({
  loader: () => getDashboardFeedbacksPageData(),
  ssr: "data-only",
  head: () =>
    createSeo({
      canonicalPath: "/dashboard/feedbacks",
      locale: getLocale(),
      noIndex: true,
      title: "Feedback",
    }),
  component: FeedbacksRoute,
});

type FeedbackItem = DashboardFeedbacksPageData["feedbacks"][number];
type FeedbackStatus = FeedbackItem["status"];
type FeedbackType = FeedbackItem["type"];

const typeBadgeClass: Record<FeedbackType, string> = {
  bug: "border-destructive/40 bg-destructive/10 text-destructive",
  general: "border-border bg-muted text-muted-foreground",
  request: "border-chart-4/40 bg-chart-4/10 text-chart-4",
};

const statusBadgeClass: Record<FeedbackStatus, string> = {
  in_review: "border-chart-4/40 bg-chart-4/10 text-chart-4",
  pending: "border-border bg-muted text-muted-foreground",
  resolved: "border-chart-2/40 bg-chart-2/10 text-chart-2",
};

function getStatusIcon(status: FeedbackStatus) {
  if (status === "in_review") {
    return <SpinnerGapIcon className="size-3.5" />;
  }
  if (status === "resolved") {
    return <CheckIcon className="size-3.5" />;
  }
  return <WarningCircleIcon className="size-3.5" />;
}

function getAdminResponseLabel(status: FeedbackStatus) {
  if (status === "resolved") {
    return m.dashboard_feedbacks_response_resolved();
  }
  if (status === "in_review") {
    return m.dashboard_feedbacks_response_in_review();
  }
  return m.dashboard_feedbacks_response_pending();
}

function FeedbackStatusPill({ status }: { status: FeedbackStatus }) {
  const label =
    status === "in_review"
      ? m.dashboard_feedbacks_status_in_review()
      : status === "resolved"
        ? m.dashboard_feedbacks_status_resolved()
        : m.dashboard_feedbacks_status_pending();

  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px] tracking-[0.16em] uppercase ${statusBadgeClass[status]}`}
    >
      {getStatusIcon(status)}
      {label}
    </span>
  );
}

function FeedbackTypePill({ type }: { type: FeedbackType }) {
  const label =
    type === "bug"
      ? m.dashboard_feedbacks_type_bug()
      : type === "request"
        ? m.dashboard_feedbacks_type_request()
        : m.dashboard_feedbacks_type_general();

  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px] tracking-[0.16em] uppercase ${typeBadgeClass[type]}`}
    >
      <MegaphoneIcon className="size-3.5" />
      {label}
    </span>
  );
}

function FeedbackCard({ feedback }: { feedback: FeedbackItem }) {
  const locale = getLocale();
  return (
    <Card className="rounded-none border bg-background">
      <CardHeader className="border-b pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <FeedbackTypePill type={feedback.type} />
              <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-text">
                <TimeValue locale={locale} time={feedback._creationTime} />
              </span>
            </div>
            <CardTitle className="font-display text-[1.2rem] leading-none tracking-[-0.03em]">
              {feedback.title}
            </CardTitle>
          </div>
          <FeedbackStatusPill status={feedback.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4 py-4">
        <p className="text-[13px] leading-[1.65] text-foreground/80">{feedback.content}</p>

        {feedback.response ? (
          <div className="border-l-2 border-chart-2/60 pl-4">
            <div className="mb-2 flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] uppercase text-chart-2">
              <SealCheckIcon className="size-3.5" />
              {getAdminResponseLabel(feedback.status)}
            </div>
            <p className="text-[13px] leading-[1.65] text-foreground/80">{feedback.response}</p>
          </div>
        ) : (
          <div className="border border-dashed border-rule bg-paper/70 px-3 py-2 text-[12px] leading-[1.6] text-muted-text">
            {getAdminResponseLabel(feedback.status)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const FEEDBACK_TYPES = ["bug", "request", "general"] as const;
type FeedbackFormType = (typeof FEEDBACK_TYPES)[number];

const feedbackSchema = z.object({
  content: z.string().trim().min(1, m.dashboard_feedbacks_composer_content_required()),
  title: z.string().trim().min(1, m.dashboard_feedbacks_composer_subject_required()),
  type: z.enum(["bug", "request", "general"]),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

function FeedbackComposer({ onSubmitted }: { onSubmitted: () => void }) {
  const [error, setError] = useState<string | null>(null);

  const form = useAppForm({
    defaultValues: {
      content: "",
      title: "",
      type: "general",
    } as FeedbackFormValues,
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        await orpcClient.feedback.create({
          content: value.content.trim(),
          title: value.title.trim(),
          type: value.type,
        });
        form.reset({ content: "", title: "", type: "general" } as FeedbackFormValues);
        onSubmitted();
      } catch {
        setError(m.dashboard_feedbacks_composer_failed());
      }
    },
    validators: {
      onSubmit: feedbackSchema,
    },
  });

  return (
    <form.AppForm>
      <Form className="mx-auto w-full space-y-6 p-6 md:p-8">
        <div>
          <p className="font-mono text-xs uppercase text-muted-text">
            {m.dashboard_feedbacks_composer_eyebrow()}
          </p>
          <h3 className="mt-4 font-display text-2xl tracking-[-0.03em] text-foreground">
            {m.dashboard_feedbacks_composer_headline()}
          </h3>
        </div>

        <form.AppField name="type">
          {(field) => (
            <FormField className="space-y-2">
              <fieldset className="m-0 min-w-0 space-y-2 p-0">
                <legend className="font-mono text-xs uppercase text-muted-text">
                  {m.dashboard_feedbacks_composer_type_label()}
                </legend>
                <RadioGroup
                  className="grid grid-cols-1 gap-3 md:grid-cols-3"
                  name={field.name}
                  onValueChange={(value) => field.handleChange(value as FeedbackFormType)}
                  value={field.state.value}
                >
                  {FEEDBACK_TYPES.map((type) => {
                    const label =
                      type === "bug"
                        ? m.dashboard_feedbacks_type_bug()
                        : type === "request"
                          ? m.dashboard_feedbacks_type_request()
                          : m.dashboard_feedbacks_type_general();
                    const id = `${field.name}-${type}`;
                    return (
                      <CardLabel key={type} htmlFor={id}>
                        <LayoutField
                          orientation="horizontal"
                          className="border border-foreground/75 px-4 py-3 transition-colors"
                        >
                          <FieldContent className="min-w-0 gap-0">
                            <FieldTitle className="font-mono uppercase">{label}</FieldTitle>
                          </FieldContent>
                          <RadioGroupItem id={id} value={type} />
                        </LayoutField>
                      </CardLabel>
                    );
                  })}
                </RadioGroup>
              </fieldset>
              <FieldError />
            </FormField>
          )}
        </form.AppField>

        <form.AppField name="title">
          {(field) => (
            <FormField className="space-y-2">
              <FieldLabel className="font-mono text-xs uppercase text-muted-text">
                {m.dashboard_feedbacks_composer_subject_label()}
              </FieldLabel>
              <Input
                className="font-mono text-xs"
                onChange={(e) => field.handleChange(e.currentTarget.value)}
                placeholder={m.dashboard_feedbacks_composer_subject_placeholder()}
                value={field.state.value}
              />
              <FieldError />
            </FormField>
          )}
        </form.AppField>

        <form.AppField name="content">
          {(field) => (
            <FormField className="space-y-2">
              <FieldLabel className="font-mono text-xs uppercase text-muted-text">
                {m.dashboard_feedbacks_composer_content_label()}
              </FieldLabel>
              <Textarea
                className="min-h-32 font-mono text-xs"
                onChange={(e) => field.handleChange(e.currentTarget.value)}
                placeholder={m.dashboard_feedbacks_composer_content_placeholder()}
                value={field.state.value}
              />
              <FieldError />
            </FormField>
          )}
        </form.AppField>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <div className="flex justify-end pt-2">
              <Button disabled={!canSubmit || isSubmitting} type="submit">
                {isSubmitting
                  ? m.dashboard_feedbacks_composer_submitting()
                  : m.dashboard_feedbacks_composer_submit()}
              </Button>
            </div>
          )}
        </form.Subscribe>
      </Form>
    </form.AppForm>
  );
}

function FeedbacksRoute() {
  const data = Route.useLoaderData();
  const { currentUser } = useRouteContext({ from: "/_authedLayout/dashboard" });
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!data || !currentUser) {
    return null;
  }

  const handleSubmitted = () => {
    setDialogOpen(false);
    void router.invalidate();
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="border bg-paper p-6 shadow-[0_10px_40px_rgba(20,18,14,0.05)]">
        <div className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-muted-text">
          {m.dashboard_feedbacks_eyebrow()}
        </div>
        <h1 className="mt-3 font-display text-[clamp(2.2rem,4vw,4rem)] leading-[0.92] tracking-[-0.04em]">
          {m.dashboard_feedbacks_title()}
        </h1>
        <p className="mt-4 max-w-2xl text-[13px] leading-[1.65] text-muted-text">
          {m.dashboard_feedbacks_description()}
        </p>
        <div className="mt-6">
          <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
            <DialogTrigger
              render={
                <button
                  className="inline-flex h-8 items-center gap-1.5 border border-rule bg-foreground px-3 font-mono text-[10px] tracking-[0.16em] uppercase text-background transition-opacity hover:opacity-85"
                  type="button"
                >
                  <PlusIcon className="size-3.5" />
                  {m.dashboard_feedbacks_raise()}
                </button>
              }
            />
            <DialogContent
              className="max-h-[85vh] max-w-2xl! overflow-y-auto border-border/60 bg-background p-0 shadow-2xl"
              showCloseButton
            >
              <DialogHeader className="sr-only">
                <DialogTitle>{m.dashboard_feedbacks_composer_eyebrow()}</DialogTitle>
                <DialogDescription>
                  {m.dashboard_feedbacks_composer_dialog_description()}
                </DialogDescription>
              </DialogHeader>
              <FeedbackComposer onSubmitted={handleSubmitted} />
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <div className="space-y-3">
        {data.feedbacks.length > 0 ? (
          data.feedbacks.map((feedback) => <FeedbackCard feedback={feedback} key={feedback._id} />)
        ) : (
          <div className="border border-dashed border-rule bg-background px-5 py-12 text-center">
            <ChatCircleTextIcon className="mx-auto size-8 text-muted-text/60" />
            <p className="mt-4 font-display text-[1.35rem] leading-none tracking-[-0.03em] text-foreground">
              {m.dashboard_feedbacks_empty_title()}
            </p>
            <p className="mx-auto mt-3 max-w-lg text-[13px] leading-[1.6] text-muted-text">
              {m.dashboard_feedbacks_empty_description()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
