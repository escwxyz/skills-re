import { useMutation } from "@tanstack/react-query";
import { useAtom, useSetAtom } from "jotai";
import { cloneElement, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEventHandler, ReactElement } from "react";
import { z } from "zod/v4";

import { loginDialogAtom, writeReviewDialogAtom } from "@/atoms/app";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel, Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Rating, RatingItem } from "@/components/ui/rating/rating";
import { useAppForm } from "@/hooks/form-hook";
import { orpc } from "@/lib/orpc";
import {
  write_review_form_body_label,
  write_review_form_body_placeholder,
  write_review_form_close_aria_label,
  write_review_form_description,
  write_review_form_failed,
  write_review_form_headline_label,
  write_review_form_headline_placeholder,
  write_review_form_rating_label,
  write_review_form_submit,
  write_review_form_submitting,
  write_review_form_success_message,
  write_review_form_thank_you,
  write_review_form_title,
  write_review_form_trigger,
} from "@/paraglide/messages";
import { ArrowRightIcon, XIcon } from "@phosphor-icons/react";
import { useRouteContext } from "@tanstack/react-router";

const reviewFormSchema = z.object({
  body: z.string().trim().min(1),
  stars: z.number().int().min(1),
  title: z.string().trim().min(1).max(120),
});

type ReviewFormValues = z.infer<typeof reviewFormSchema>;

interface WriteReviewFormProps {
  initialStars: number;
  isOpen: boolean;
  // onClose: () => void;
  skillId: string;
}

function WriteReviewForm({ initialStars, isOpen, skillId }: WriteReviewFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const headlineInputRef = useRef<HTMLInputElement>(null);

  const writeReviews = useMutation(orpc.reviews.create.mutationOptions({}));
  const defaultValues = useMemo<ReviewFormValues>(
    () => ({
      body: "",
      stars: initialStars,
      title: "",
    }),
    [initialStars],
  );

  const form = useAppForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setSubmitError(null);

      await writeReviews.mutateAsync(
        {
          content: value.body.trim(),
          rating: value.stars,
          skillId,
          title: value.title.trim(),
        },
        {
          onSuccess: () => {
            setSubmitted(true);
          },
          onError: (error) => {
            setSubmitError(error instanceof Error ? error.message : write_review_form_failed());
          },
        },
      );
    },
    validators: {
      onSubmit: reviewFormSchema,
    },
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSubmitted(false);
    setSubmitError(null);
    form.reset(defaultValues);
    headlineInputRef.current?.focus();
  }, [defaultValues, form, isOpen]);

  if (submitted) {
    return (
      <div className="py-6 text-center">
        <div className="font-display mb-2 text-[32px] font-normal">
          {write_review_form_thank_you()}
        </div>
        <p className="font-serif mb-6 text-[14px] text-muted-foreground">
          {write_review_form_success_message()}
        </p>
      </div>
    );
  }

  return (
    <form.AppForm>
      <Form className="flex flex-col gap-5">
        <form.AppField name="stars">
          {(field) => (
            <Field className="space-y-2">
              <FieldLabel className="font-mono text-xs uppercase text-muted-foreground block">
                {write_review_form_rating_label()}
              </FieldLabel>
              <Rating
                defaultValue={initialStars}
                onValueChange={field.handleChange}
                value={field.state.value}
              >
                {Array.from({ length: 5 }, (_, index) => (
                  <RatingItem key={index} />
                ))}
              </Rating>
              <FieldError />
            </Field>
          )}
        </form.AppField>

        <form.AppField name="title">
          {(field) => (
            <Field className="space-y-2">
              <FieldLabel className="font-mono text-xs uppercase text-muted-foreground block">
                {write_review_form_headline_label()}
              </FieldLabel>
              <Input
                ref={headlineInputRef}
                maxLength={120}
                placeholder={write_review_form_headline_placeholder()}
                onChange={(event) => field.handleChange(event.target.value)}
                value={field.state.value}
              />
              <FieldError />
            </Field>
          )}
        </form.AppField>

        <form.AppField name="body">
          {(field) => (
            <Field className="space-y-2">
              <FieldLabel className="font-mono text-xs uppercase text-muted-foreground block">
                {write_review_form_body_label()}
              </FieldLabel>
              <Textarea
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder={write_review_form_body_placeholder()}
                rows={5}
                value={field.state.value}
              />
              <FieldError />
            </Field>
          )}
        </form.AppField>

        {submitError && (
          <p className="font-mono text-xs uppercase text-destructive">{submitError}</p>
        )}

        <div className="flex gap-3 pt-1">
          <form.Subscribe
            selector={(state) => ({
              body: state.values.body,
              isSubmitting: state.isSubmitting,
              stars: state.values.stars,
              title: state.values.title,
            })}
          >
            {({ body, isSubmitting, stars, title }) => {
              const canSubmit = stars > 0 && title.trim().length > 0 && body.trim().length > 0;

              return (
                <Button
                  className="flex-1"
                  disabled={Boolean(isSubmitting) || !canSubmit}
                  type="submit"
                >
                  {isSubmitting ? write_review_form_submitting() : write_review_form_submit()}
                </Button>
              );
            }}
          </form.Subscribe>
        </div>
      </Form>
    </form.AppForm>
  );
}

interface WriteReviewDialogProps {
  onOpenChange?: (open: boolean) => void;
}

export function WriteReviewDialog({ onOpenChange }: WriteReviewDialogProps) {
  const { currentUser } = useRouteContext({ from: "__root__" });
  const [{ open, initialStars, skillId }, setWriteReviewDialog] = useAtom(writeReviewDialogAtom);

  const handleOpenChange = (nextOpen: boolean) => {
    setWriteReviewDialog((prev) => ({ ...prev, open: nextOpen }));
    onOpenChange?.(nextOpen);
  };

  if (!currentUser || !skillId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg p-4 sm:p-6" showCloseButton={false}>
        <DialogHeader className="mb-2">
          <div className="flex items-start justify-between">
            <DialogTitle className="font-display text-[28px] font-normal leading-tight">
              {write_review_form_title()}
            </DialogTitle>
            <DialogClose
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={write_review_form_close_aria_label()}
                >
                  <XIcon />
                </Button>
              }
            />
          </div>
          <p className="font-mono mt-1 text-[10.5px] tracking-[.14em] uppercase text-muted-foreground">
            {write_review_form_description()}
          </p>
        </DialogHeader>
        <WriteReviewForm initialStars={initialStars} isOpen={open} skillId={skillId} />
      </DialogContent>
    </Dialog>
  );
}

interface WriteReviewCtaProps {
  skillId: string;
  trigger?: ReactElement<{ onClick?: MouseEventHandler<HTMLButtonElement> }>;
}

export function WriteReviewCta({ skillId, trigger }: WriteReviewCtaProps) {
  const { currentUser } = useRouteContext({ from: "__root__" });
  const setWriteReviewDialog = useSetAtom(writeReviewDialogAtom);
  const setLoginDialog = useSetAtom(loginDialogAtom);

  const handleClick = () => {
    if (currentUser) {
      setWriteReviewDialog({ open: true, initialStars: 0, skillId });
      return;
    }

    setLoginDialog((prev) => ({ ...prev, open: true }));
  };

  if (trigger) {
    return cloneElement(trigger, {
      onClick: (event) => {
        trigger.props.onClick?.(event);
        handleClick();
      },
    });
  }

  return (
    <Button onClick={handleClick} size="lg" className="w-full justify-between items-center">
      {write_review_form_trigger()} <ArrowRightIcon />
    </Button>
  );
}
