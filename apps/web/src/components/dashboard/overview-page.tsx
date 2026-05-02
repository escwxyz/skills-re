"use client";

import { useEffect, useState } from "react";

import { DashboardShell } from "@/layouts/dashboard-shell";
import { orpc } from "@/lib/orpc";

import { DashboardOverview } from "@/components/dashboard/overview";

import type { CurrentUser, DashboardFeedbackItem, ReviewItem, SkillItem } from "./shared";

interface Props {
  currentUser?: CurrentUser | null;
}

export function DashboardOverviewPage({ currentUser }: Props) {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [savedSkills, setSavedSkills] = useState<SkillItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [feedbacks, setFeedbacks] = useState<DashboardFeedbackItem[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [feedbackTotal, setFeedbackTotal] = useState(0);
  const [feedbackPending, setFeedbackPending] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadData = async () => {
      if (!currentUser) {
        if (isActive) {
          setSkills([]);
          setSavedSkills([]);
          setReviews([]);
          setFeedbacks([]);
          setReviewsTotal(0);
          setFeedbackTotal(0);
          setFeedbackPending(0);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);

      const [
        skillsResult,
        savedResult,
        reviewsResult,
        feedbacksResult,
        reviewsCountResult,
        feedbackCountResult,
      ] = await Promise.allSettled([
        orpc.skills.listMine({ limit: 100 }),
        orpc.skills.listMineSaved({ limit: 100 }),
        orpc.reviews.listMine({ limit: 10 }),
        orpc.feedback.listMine({ limit: 10 }),
        orpc.reviews.countMine({}),
        orpc.feedback.countMine({}),
      ]);

      if (isActive) {
        if (skillsResult.status === "fulfilled") {
          setSkills(skillsResult.value);
        }
        if (savedResult.status === "fulfilled") {
          setSavedSkills(savedResult.value);
        }
        if (reviewsResult.status === "fulfilled") {
          setReviews(reviewsResult.value);
        }
        if (feedbacksResult.status === "fulfilled") {
          setFeedbacks(feedbacksResult.value);
        }
        if (reviewsCountResult.status === "fulfilled") {
          setReviewsTotal(reviewsCountResult.value);
        }
        if (feedbackCountResult.status === "fulfilled") {
          setFeedbackTotal(feedbackCountResult.value.total);
          setFeedbackPending(feedbackCountResult.value.pending);
        }
        setIsLoading(false);
      }
    };

    void loadData();

    return () => {
      isActive = false;
    };
  }, [currentUser]);

  return (
    <DashboardShell activeRoute="overview" currentUser={currentUser}>
      <DashboardOverview
        currentUser={currentUser}
        feedbackPending={feedbackPending}
        feedbackTotal={feedbackTotal}
        feedbacks={feedbacks}
        isLoading={isLoading}
        reviews={reviews}
        reviewsTotal={reviewsTotal}
        savedSkills={savedSkills}
        skills={skills}
      />
    </DashboardShell>
  );
}
