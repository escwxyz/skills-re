"use client";

import { useStore } from "@nanostores/react";
import { useState } from "react";

import { isAuthenticatedAtom, isLoginDialogOpenAtom } from "@/stores/app";
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
}

function WriteReviewForm({ onClose }: WriteReviewFormProps) {
  const [stars, setStars] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = stars > 0 && title.trim().length > 0 && body.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    // TODO: wire to API
    setSubmitted(true);
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

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={!canSubmit} className="flex-1">
          Submit Review
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function WriteReviewCta() {
  const isAuthenticated = useStore(isAuthenticatedAtom);
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    if (!isAuthenticated) {
      isLoginDialogOpenAtom.set(true);
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="btn w-full justify-between cursor-pointer"
      >
        Write a Review <span>→</span>
      </button>

      {isAuthenticated && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-lg p-4 sm:p-6" showCloseButton={false}>
            <DialogHeader className="mb-2">
              <div className="flex items-start justify-between">
                <DialogTitle className="font-display text-[28px] font-normal leading-tight">
                  Write a review
                </DialogTitle>
                <DialogClose
                  render={
                    <Button variant="ghost" size="icon-sm" aria-label="Close" />
                  }
                >
                  ✕
                </DialogClose>
              </div>
              <p className="font-mono text-[10.5px] tracking-[.14em] uppercase text-muted-text mt-1">
                Your review is public and tied to your account.
              </p>
            </DialogHeader>
            <WriteReviewForm onClose={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
