// oxlint-disable no-nested-ternary
"use client";

import { useMemo, useState } from "react";
import {
  ChatCircleTextIcon,
  CheckIcon,
  MegaphoneIcon,
  PlusIcon,
  SealCheckIcon,
  SpinnerGapIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { FeedbackComposer } from "@/components/feedback-composer";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { formatDateTime } from "@/lib/utils";

import type { CurrentUser } from "./shared";
import { DashboardSection } from "./shared";

type FeedbackStatus = "pending" | "resolved" | "in_review";
type FeedbackType = "bug" | "request" | "general";

interface DashboardFeedbackItem {
  _creationTime: number;
  _id: string;
  content: string;
  response: string | null;
  status: FeedbackStatus;
  title: string;
  type: FeedbackType;
  userId: string;
}

interface Props {
  currentUser?: CurrentUser | null;
  feedbacks: DashboardFeedbackItem[];
  feedbacksError?: string | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

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

const statusLabel: Record<FeedbackStatus, string> = {
  in_review: m.ui_feedback_in_review(),
  pending: m.ui_feedback_pending(),
  resolved: m.ui_feedback_resolved(),
};

const typeLabel: Record<FeedbackType, string> = {
  bug: m.ui_bug(),
  general: m.ui_general(),
  request: m.ui_request(),
};

const getStatusIcon = (status: FeedbackStatus) => {
  switch (status) {
    case "in_review": {
      return <SpinnerGapIcon className="size-3.5" />;
    }
    case "resolved": {
      return <CheckIcon className="size-3.5" />;
    }
    default: {
      return <WarningCircleIcon className="size-3.5" />;
    }
  }
};

const getAdminResponseLabel = (status: FeedbackStatus) => {
  if (status === "resolved") {
    return m.ui_resolved_by_admin();
  }

  if (status === "in_review") {
    return m.ui_admin_is_reviewing_this();
  }

  return m.ui_waiting_for_admin_follow_up();
};

function FeedbackStatusPill({ status }: { status: FeedbackStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px] tracking-[0.16em] uppercase ${statusBadgeClass[status]}`}
    >
      {getStatusIcon(status)}
      {statusLabel[status]}
    </span>
  );
}

function FeedbackTypePill({ type }: { type: FeedbackType }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px] tracking-[0.16em] uppercase ${typeBadgeClass[type]}`}
    >
      <MegaphoneIcon className="size-3.5" />
      {typeLabel[type]}
    </span>
  );
}

function FeedbackCard({ feedback }: { feedback: DashboardFeedbackItem }) {
  const runtimeLocale = getLocale();
  return (
    <Card className="rounded-none border-rule/70 bg-background">
      <CardHeader className="border-b border-rule/60 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <FeedbackTypePill type={feedback.type} />
              <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-text">
                {formatDateTime(feedback._creationTime, runtimeLocale)}
              </span>
            </div>
            <CardTitle className="font-serif text-[1.35rem] leading-none tracking-[-0.03em]">
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

export function DashboardFeedbacks({
  currentUser,
  feedbacks,
  feedbacksError,
  isLoading,
  onRefresh,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const displayHandle = useMemo(
    () =>
      currentUser?.github ?? currentUser?.email?.split("@")[0] ?? currentUser?.id ?? "dashboard",
    [currentUser],
  );

  return (
    <div className="space-y-4">
      <DashboardSection
        eyebrow={m.ui_support_tickets()}
        title={m.ui_support_tickets()}
        description={`${m.ui_track_the_status_of_your_bug_reports_and_feature_requests()} ${displayHandle}.`}
        actions={
          <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
            <DialogTrigger
              render={
                <button
                  className="inline-flex h-8 items-center gap-1.5 border border-rule bg-foreground px-3 font-mono text-[10px] tracking-[0.16em] uppercase text-background transition-opacity hover:opacity-85"
                  type="button"
                >
                  <PlusIcon className="size-3.5" />
                  {m.ui_raise_feedback()}
                </button>
              }
            />
            <DialogContent className="!max-w-4xl max-h-[85vh] overflow-y-auto rounded-none border-border/60 bg-background p-0 shadow-2xl">
              <DialogHeader className="sr-only">
                <DialogTitle>{m.ui_submit_feedback()}</DialogTitle>
                <DialogDescription>{m.ui_submit_feedback_dialog_description()}</DialogDescription>
              </DialogHeader>
              <FeedbackComposer
                onSubmitted={() => {
                  onRefresh?.();
                  setDialogOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        }
      >
        <div className="space-y-3">
          {isLoading ? (
            <div className="border border-dashed border-rule bg-background px-5 py-10 text-center">
              <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-text">
                {m.ui_loading_feedback()}
              </p>
            </div>
          ) : feedbacksError ? (
            <div className="border border-dashed border-destructive/40 bg-background px-5 py-10 text-center">
              <WarningCircleIcon className="mx-auto size-8 text-destructive" />
              <p className="mt-4 font-serif text-[1.4rem] leading-none tracking-[-0.03em] text-foreground">
                {m.ui_failed_to_load_feedback()}
              </p>
              <p className="mx-auto mt-3 max-w-lg text-[13px] leading-[1.6] text-muted-text">
                {m.ui_try_again_later()}
              </p>
            </div>
          ) : feedbacks.length > 0 ? (
            feedbacks.map((feedback) => <FeedbackCard feedback={feedback} key={feedback._id} />)
          ) : (
            <div className="border border-dashed border-rule bg-background px-5 py-10 text-center">
              <ChatCircleTextIcon className="mx-auto size-8 text-muted-text" />
              <p className="mt-4 font-serif text-[1.4rem] leading-none tracking-[-0.03em] text-foreground">
                {m.ui_no_tickets_submitted()}
              </p>
              <p className="mx-auto mt-3 max-w-lg text-[13px] leading-[1.6] text-muted-text">
                {m.ui_click_raise_feedback_to_open_the_dialog_and_create_the_first_item_in_your_feedback_queue()}
              </p>
            </div>
          )}
        </div>
      </DashboardSection>
    </div>
  );
}
