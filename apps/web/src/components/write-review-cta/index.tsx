"use client";

import { useStore } from "@nanostores/react";
import { useState } from "react";

import { isAuthenticatedAtom, isLoginDialogOpenAtom } from "@/stores/app";
import { orpc } from "@/lib/orpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <div className="flex gap-1" onMouseLeave={() => setHovered(0)}>
      {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          className={`text-2xl transition-colors ${n <= active ? "text-ink" : "text-rule"}`}
          onMouseEnter={() => setHovered(n)}
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

interface WriteReviewFormProps {
  onClose: () => void;
  skillId: string;
}

function WriteReviewForm({ onClose, skillId }: WriteReviewFormProps) {
  const [stars, setStars] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = stars > 0 && title.trim().length > 0 && body.trim().length > 0;

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const content = `**${title.trim()}**\n\n${body.trim()}`;
      await orpc.reviews.create({ content, rating: stars, skillId });
      setSubmitted(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="py-6 text-center">
        <div className="font-display text-[32px] font-normal mb-2">Thank you.</div>
        <p className="font-serif text-[14px] text-ink-2 mb-6">
          Your review has been submitted and will appear after moderation.
        </p>
        <Button variant="outline" onClick={onClose} className="w-full">
          Close
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label className="eyebrow text-muted-text block mb-2">Rating</label>
        <StarPicker value={stars} onChange={setStars} />
      </div>

      <div>
        <label className="eyebrow text-muted-text block mb-2">Headline</label>
        <Input
          placeholder="Summarise your experience in one line"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
        />
      </div>

      <div>
        <label className="eyebrow text-muted-text block mb-2">Review</label>
        <Textarea
          placeholder="What worked well? What didn't? Be specific — version numbers, team size, and use-case help future readers."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
        />
      </div>

      {error && (
        <p className="font-mono text-[11px] tracking-[.12em] text-editorial-red">{error}</p>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={!canSubmit || submitting} className="flex-1">
          {submitting ? "Submitting…" : "Submit Review"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface WriteReviewCtaProps {
  skillId: string;
}

export function WriteReviewCta({ skillId }: WriteReviewCtaProps) {
  const isAuthenticated = useStore(isAuthenticatedAtom);
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    if (isAuthenticated) {
      setOpen(true);
    } else {
      isLoginDialogOpenAtom.set(true);
    }
  };

  return (
    <>
      <button onClick={handleClick} className="btn w-full justify-between cursor-pointer">
        Write a Review <span>→</span>
      </button>

      {isAuthenticated && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            className="w-[calc(100%-2rem)] max-w-lg p-4 sm:p-6"
            showCloseButton={false}
          >
            <DialogHeader className="mb-2">
              <div className="flex items-start justify-between">
                <DialogTitle className="font-display text-[28px] font-normal leading-tight">
                  Write a review
                </DialogTitle>
                <DialogClose render={<Button variant="ghost" size="icon-sm" aria-label="Close" />}>
                  ✕
                </DialogClose>
              </div>
              <p className="font-mono text-[10.5px] tracking-[.14em] uppercase text-muted-text mt-1">
                Your review is public and tied to your account.
              </p>
            </DialogHeader>
            <WriteReviewForm skillId={skillId} onClose={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
