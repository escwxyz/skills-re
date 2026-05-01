"use client";

import { useId, useState } from "react";
import { z } from "zod/v4";

import { useAppForm } from "@/hooks/form-hook";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

import { Button } from "@/components/ui/button";
import { Field as FormField, FieldError, Form } from "@/components/ui/form";
import { Field as LayoutField, FieldContent, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

type FeedbackType = "bug" | "request" | "general";

const feedbackTypes: FeedbackType[] = ["bug", "request", "general"];

interface Props {
  onSubmitted?: () => void;
}

const feedbackSchema = z.object({
  content: z.string().trim().min(1, m.ui_please_enter_feedback_details()),
  title: z.string().trim().min(1, m.ui_please_enter_a_subject()),
  type: z.enum(["bug", "request", "general"]),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

export function FeedbackComposer({ onSubmitted }: Props) {
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const contentId = useId();

  const form = useAppForm({
    defaultValues: {
      content: "",
      title: "",
      type: "general",
    } as FeedbackFormValues,
    onSubmit: async ({ value }) => {
      setError(null);

      try {
        await orpc.feedback.create({
          content: value.content.trim(),
          title: value.title.trim(),
          type: value.type,
        });

        form.reset({
          content: "",
          title: "",
          type: "general",
        } as FeedbackFormValues);

        onSubmitted?.();
      } catch (caughtError) {
        console.error("Failed to submit feedback", caughtError);
        setError(m.ui_feedback_submission_failed());
      }
    },
    validators: {
      onSubmit: feedbackSchema,
    },
  });

  return (
    <form.AppForm>
      <Form className="mx-auto w-full max-w-4xl space-y-6 p-6 md:p-8">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase text-muted-text">{m.ui_submit_feedback()}</p>
          <h3 className="mt-4 text-2xl text-foreground">
            {m.ui_report_a_bug_or_request_a_change()}
          </h3>
        </div>

        <form.AppField name="type">
          {(field) => (
            <FormField className="space-y-2">
              <fieldset className="m-0 min-w-0 space-y-2 p-0">
                <legend className="font-mono text-xs uppercase text-muted-text">
                  {m.ui_feedback_type()}
                </legend>
                <RadioGroup
                  className="grid gap-3 grid-cols-1 md:grid-cols-3"
                  name={field.name}
                  onValueChange={(value) => field.handleChange(value as FeedbackType)}
                  value={field.state.value}
                >
                  {feedbackTypes.map((type) => {
                    let label = m.ui_general();

                    if (type === "bug") {
                      label = m.ui_bug();
                    } else if (type === "request") {
                      label = m.ui_request();
                    }

                    const id = `${field.name}-${type}`;

                    return (
                      <FieldLabel key={type} htmlFor={id}>
                        <LayoutField
                          orientation="horizontal"
                          className="border border-foreground/75 px-4 py-3 transition-colors"
                        >
                          <FieldContent className="min-w-0 gap-0">
                            <FieldTitle className="font-mono uppercase">{label}</FieldTitle>
                          </FieldContent>
                          <RadioGroupItem id={id} value={type} />
                        </LayoutField>
                      </FieldLabel>
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
              <FieldLabel className="font-mono text-xs uppercase text-muted-text" htmlFor={titleId}>
                {m.ui_subject()}
              </FieldLabel>
              <Input
                id={titleId}
                className="font-mono text-xs"
                onChange={(event) => field.handleChange(event.currentTarget.value)}
                placeholder={m.ui_brief_summary()}
                required
                value={field.state.value}
              />
              <FieldError />
            </FormField>
          )}
        </form.AppField>

        <form.AppField name="content">
          {(field) => (
            <FormField className="space-y-2">
              <FieldLabel
                className="font-mono text-xs uppercase text-muted-text"
                htmlFor={contentId}
              >
                {m.ui_content()}
              </FieldLabel>
              <Textarea
                id={contentId}
                className="min-h-32 font-mono text-xs"
                onChange={(event) => field.handleChange(event.currentTarget.value)}
                placeholder={m.ui_describe_the_issue_or_idea()}
                required
                value={field.state.value}
              />
              <FieldError />
            </FormField>
          )}
        </form.AppField>

        {error ? <p className="text-sm text-foreground">{error}</p> : null}

        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <div className="flex justify-end pt-2">
              <Button
                className="cursor-pointer px-6"
                disabled={!canSubmit || isSubmitting}
                type="submit"
              >
                {isSubmitting ? m.ui_sending() : m.ui_submit_feedback()}
              </Button>
            </div>
          )}
        </form.Subscribe>
      </Form>
    </form.AppForm>
  );
}
