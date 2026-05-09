import { useState } from "react";
import { useAppForm } from "@/hooks/form-hook";
import { z } from "zod/v4";
import { Field, FieldError, FieldLabel, Form } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { orpc } from "@/lib/orpc";
import { useMutation } from "@tanstack/react-query";
import { m } from "@/paraglide/messages";

type NewsletterStatus = "idle" | "submitting" | "submitted" | "error";

function SubmitLabel({
  isSubmitted,
  isSubmitting,
}: {
  isSubmitted: boolean;
  isSubmitting: boolean;
}) {
  if (isSubmitted) {
    return <span>{m.newsletter_form_submit_submitted()}</span>;
  }
  if (isSubmitting) {
    return <span>{m.newsletter_form_submit_submitting()}</span>;
  }
  return (
    <span className="flex items-center gap-1">
      {m.newsletter_form_submit_idle()} <ArrowUpRightIcon />
    </span>
  );
}

const formSchema = z.object({
  email: z.email(),
});

type FormSchema = z.infer<typeof formSchema>;

interface NewsletterFormProps {
  className?: string;
}

export const NewsletterForm = ({ className }: NewsletterFormProps) => {
  const [status, setStatus] = useState<NewsletterStatus>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const subscribe = useMutation(orpc.newsletter.create.mutationOptions({}));

  const form = useAppForm({
    defaultValues: {
      email: "",
    } as FormSchema,
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      setStatus("submitting");
      await subscribe.mutateAsync(
        { email: value.email },
        {
          onError(error) {
            setStatus("error");
            setSubmitError(m.newsletter_form_submit_error());
            console.log(error.message);
          },
          onSuccess: () => {
            setStatus("submitted");
          },
        },
      );
    },
    validators: {
      onSubmit: formSchema,
    },
  });

  return (
    <form.AppForm>
      <Form autoComplete="on" className={cn("w-full", className)}>
        <div className="space-y-1.5">
          <div className="flex w-full items-center gap-3 border-b border-border pb-2">
            <form.AppField name="email">
              {(field) => (
                <Field className="w-full">
                  <FieldLabel className="sr-only">{m.newsletter_form_email_label()}</FieldLabel>
                  <Input
                    autoComplete="email"
                    className="h-9 border-none bg-transparent px-0 font-serif text-[15px] italic placeholder:text-muted-foreground/60 focus-visible:ring-0 dark:bg-transparent"
                    onChange={(e) => {
                      if (status !== "idle") {
                        setStatus("idle");
                      }
                      setSubmitError(null);
                      field.handleChange(e.target.value);
                    }}
                    placeholder={m.newsletter_form_email_placeholder()}
                    value={field.state.value}
                  />
                  <FieldError />
                </Field>
              )}
            </form.AppField>

            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button
                  className="shrink-0 rounded-none border-none bg-transparent p-0 font-mono text-[10.5px] tracking-[.14em] uppercase text-foreground hover:text-muted-foreground"
                  disabled={
                    status === "submitted" || status === "submitting" || isSubmitting || !canSubmit
                  }
                  type="submit"
                >
                  <SubmitLabel
                    isSubmitted={status === "submitted"}
                    isSubmitting={status === "submitting" || !!isSubmitting}
                  />
                </Button>
              )}
            </form.Subscribe>
          </div>

          <div className="flex items-start justify-between gap-3">
            <p
              aria-live="polite"
              className={cn("font-mono text-[10px] tracking-[.06em]", {
                "text-destructive": status === "error",
                "text-muted-foreground": status !== "error",
              })}
            >
              {status === "idle" && m.newsletter_form_status_idle()}
              {status === "submitting" && m.newsletter_form_status_submitting()}
              {status === "submitted" && m.newsletter_form_status_submitted()}
              {status === "error" && (submitError ?? m.newsletter_form_submit_error())}
            </p>
          </div>
        </div>
      </Form>
    </form.AppForm>
  );
};
