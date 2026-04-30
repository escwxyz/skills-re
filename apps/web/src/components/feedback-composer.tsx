"use client";

import { useId, useState } from "react";
import type { SubmitEventHandler } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { orpc } from "@/lib/orpc";

type FeedbackType = "bug" | "request" | "general";

const feedbackTypes: {
  description: string;
  label: string;
  value: FeedbackType;
}[] = [
  {
    description: "Unexpected behavior or a broken flow.",
    label: "Bug",
    value: "bug",
  },
  {
    description: "A new capability or workflow improvement.",
    label: "Request",
    value: "request",
  },
  {
    description: "General notes, questions, or follow-up.",
    label: "General",
    value: "general",
  },
];

export function FeedbackComposer() {
  const titleId = useId();
  const contentId = useId();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<FeedbackType>("bug");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = title.trim().length > 0 && content.trim().length > 0 && !isSubmitting;

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await orpc.feedback.create({
        content: content.trim(),
        title: title.trim(),
        type,
      });

      setTitle("");
      setContent("");

      window.location.reload();
    } catch (caughtError) {
      console.error("Failed to submit feedback", caughtError);
      setError("Could not submit feedback. If you are signed out, this will fail for now.");
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4 border border-rule bg-[#f8f2e6] p-4 md:p-5" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-text">
            Submit feedback
          </p>
          <h3 className="mt-3 font-serif text-[clamp(1.7rem,2.4vw,2.6rem)] leading-[0.96] tracking-[-0.03em]">
            Report a bug or request a change
          </h3>
        </div>
        <p className="max-w-[20rem] text-[13px] leading-[1.55] text-muted-text">
          This form is wired to the live feedback endpoint. Authentication checks will be added
          later.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-4">
          <div className="space-y-2">
            <label
              className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-muted-text"
              htmlFor={titleId}
            >
              Title
            </label>
            <Input
              id={titleId}
              name="title"
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
              placeholder="Short summary"
            />
          </div>

          <div className="space-y-2">
            <label
              className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-muted-text"
              htmlFor={contentId}
            >
              Details
            </label>
            <Textarea
              id={contentId}
              name="content"
              value={content}
              onChange={(event) => setContent(event.currentTarget.value)}
              placeholder="Explain what happened, what you expected, and any context."
              className="min-h-40"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-muted-text">
              Type
            </p>
            <div className="flex border border-rule" role="group" aria-label="Feedback type">
              {feedbackTypes.map((item) => {
                const active = type === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setType(item.value)}
                    className={`flex-1 border-r border-rule px-2 py-2 font-mono text-[10.5px] tracking-[0.12em] uppercase last:border-r-0 transition-colors ${
                      active
                        ? "bg-foreground text-background"
                        : "bg-background text-muted-text hover:bg-[#f0ebe0]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 border border-rule bg-background p-3">
            <p className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-muted-text">
              Queue hints
            </p>
            <ul className="space-y-2 text-[13px] leading-normal text-muted-text">
              {feedbackTypes.map((item) => (
                <li key={item.value}>
                  <span className="font-medium text-foreground">{item.label}:</span>{" "}
                  {item.description}
                </li>
              ))}
            </ul>
          </div>

          {error ? (
            <p className="border border-rule bg-background px-3 py-2 text-[13px] leading-normal text-foreground">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-rule pt-4">
        <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-muted-text">
          {canSubmit ? "Ready to send" : "Fill in title and details"}
        </p>
        <Button disabled={!canSubmit} type="submit">
          {isSubmitting ? "Sending..." : "Send feedback"}
        </Button>
      </div>
    </form>
  );
}
