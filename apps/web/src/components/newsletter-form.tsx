import { useState } from "react";
import { useAppForm } from "@/hooks/form-hook";
import { z } from "zod/v4";
import { Field, FieldError, Form } from "./ui/form";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { orpc } from "@/lib/orpc";

function SubmitLabel({
  isSubmitted,
  isSubmitting,
}: {
  isSubmitted: boolean;
  isSubmitting: boolean;
}) {
  if (isSubmitted) {
    return <span>Filed ✓</span>;
  }
  if (isSubmitting) {
    return <span>Filing…</span>;
  }
  return (
    <span className="flex items-center gap-1">
      Submit <ArrowUpRightIcon weight="bold" />
    </span>
  );
}

const formSchema = z.object({
  email: z.email(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  device: z.enum(["mobile", "desktop"]).nullable().optional(),
  ip: z.string().nullable().optional(),
});

type FormSchema = z.infer<typeof formSchema>;

interface NewsletterFormProps {
  className?: string;
  initialIp?: string | null;
  initialCountry?: string | null;
  initialCity?: string | null;
  initialDevice?: "mobile" | "desktop" | null;
}

export const NewsletterForm = ({
  className,
  initialIp,
  initialCountry,
  initialCity,
  initialDevice,
}: NewsletterFormProps) => {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useAppForm({
    defaultValues: {
      email: "",
      ip: initialIp ?? null,
      country: initialCountry ?? null,
      city: initialCity ?? null,
      device: initialDevice ?? null,
    } as FormSchema,

    onSubmit: async ({ value }) => {
      setSubmitError(null);
      try {
        await orpc.newsletter.create({
          email: value.email,
          ip: value.ip,
          country: value.country,
          city: value.city,
          device: value.device,
        });
      } catch {
        setSubmitError("Couldn't file your subscription — please try again.");
      }
    },
    validators: {
      onSubmit: formSchema,
    },
  });

  return (
    <form.AppForm>
      <Form autoComplete="on" className={cn("w-full", className)}>
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting, state.isSubmitted]}
        >
          {([canSubmit, isSubmitting, isSubmitted]) => (
            <div className="space-y-1.5">
              <div className="flex w-full items-center gap-3 border-b border-border pb-2">
                <form.AppField name="email">
                  {(field) => (
                    <Field className="w-full">
                      <Input
                        autoComplete="email"
                        className="h-9 border-none bg-transparent px-0 font-serif text-[15px] italic placeholder:text-muted-foreground/60 focus-visible:ring-0 dark:bg-transparent"
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="your@email.address"
                        value={field.state.value}
                      />
                      <FieldError />
                    </Field>
                  )}
                </form.AppField>

                <Button
                  className="shrink-0 cursor-pointer rounded-none border-none bg-transparent p-0 font-mono text-[10.5px] tracking-[.14em] uppercase text-foreground hover:text-muted-foreground"
                  disabled={isSubmitted || !canSubmit}
                  type="submit"
                >
                  <SubmitLabel isSubmitted={!!isSubmitted} isSubmitting={!!isSubmitting} />
                </Button>
              </div>

              {submitError && (
                <p className="font-mono text-[10px] tracking-[.06em] text-destructive">
                  {submitError}
                </p>
              )}
            </div>
          )}
        </form.Subscribe>
      </Form>
    </form.AppForm>
  );
};
