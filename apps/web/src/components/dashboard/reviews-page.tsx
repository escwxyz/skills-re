"use client";

import { useEffect, useState } from "react";

import { DashboardShell } from "@/layouts/dashboard-shell";
import { m } from "@/paraglide/messages";
import { orpc } from "@/lib/orpc";

import { DashboardReviews } from "@/components/dashboard/reviews";

import type { CurrentUser } from "./shared";

interface ReviewItem {
  content: string;
  createdAt: number;
  id: string;
  rating: number;
  skillSlug: string;
  skillTitle: string;
  title?: string | null;
  updatedAt: number;
}

interface Props {
  currentUser?: CurrentUser | null;
}

export function DashboardReviewsPage({ currentUser }: Props) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadReviews = async () => {
      if (!currentUser) {
        if (isActive) {
          setReviews([]);
          setReviewsError(null);
          setIsLoading(false);
        }

        return;
      }

      setIsLoading(true);
      setReviewsError(null);

      try {
        const data = await orpc.reviews.listMine({ limit: 100 });

        if (isActive) {
          setReviews(data);
          setReviewsError(null);
        }
      } catch {
        if (isActive) {
          setReviewsError(m.dashboard_reviews_failed());
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadReviews();

    return () => {
      isActive = false;
    };
  }, [currentUser]);

  return (
    <DashboardShell activeRoute="reviews" currentUser={currentUser}>
      <DashboardReviews
        currentUser={currentUser}
        isLoading={isLoading}
        reviews={reviews}
        reviewsError={reviewsError}
      />
    </DashboardShell>
  );
}
