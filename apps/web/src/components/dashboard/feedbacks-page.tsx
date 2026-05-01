"use client";

import { useEffect, useState } from "react";

import { DashboardShell } from "@/layouts/dashboard-shell";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

import { DashboardFeedbacks } from "@/components/dashboard/feedbacks";

import type { CurrentUser } from "./shared";

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
}

export function DashboardFeedbacksPage({ currentUser }: Props) {
  const [feedbacks, setFeedbacks] = useState<DashboardFeedbackItem[]>([]);
  const [feedbacksError, setFeedbacksError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  const refreshFeedbacks = () => {
    setRefreshTick((value) => value + 1);
  };

  useEffect(() => {
    let isActive = true;

    const loadFeedbacks = async () => {
      if (!currentUser) {
        if (isActive) {
          setFeedbacks([]);
          setFeedbacksError(null);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setFeedbacksError(null);

      try {
        const data = await orpc.feedback.listMine({ limit: 100 });

        if (isActive) {
          if (data.length === 0) {
            setFeedbacks([]);
          } else {
            setFeedbacks(data);
          }
          setFeedbacksError(null);
        }
      } catch {
        if (isActive) {
          setFeedbacksError(m.ui_failed_to_load_feedback());
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadFeedbacks();

    return () => {
      isActive = false;
    };
  }, [currentUser, refreshTick]);

  return (
    <DashboardShell activeRoute="feedbacks" currentUser={currentUser}>
      <DashboardFeedbacks
        currentUser={currentUser}
        feedbacks={feedbacks}
        feedbacksError={feedbacksError}
        isLoading={isLoading}
        onRefresh={refreshFeedbacks}
      />
    </DashboardShell>
  );
}
