import { useState } from "react";
import { FlagIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react";
import { z } from "zod/v4";

import { ClaimAuthorButton } from "@/components/claim-author-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field as FormField, FieldError, FieldLabel, Form } from "@/components/ui/form";
import {
  Field as LayoutField,
  FieldContent,
  FieldTitle,
  FieldLabel as CardLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useAppForm } from "@/hooks/form-hook";
import { orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

const REPORT_TYPES = ["skill_issue", "skill_display", "skill_takedown"] as const;

const reportTypeLabels: Record<(typeof REPORT_TYPES)[number], string> = {
  skill_display: m.skill_report_dialog_type_skill_display(),
  skill_issue: m.skill_report_dialog_type_skill_issue(),
  skill_takedown: m.skill_report_dialog_type_skill_takedown(),
};

const reportSchema = z.object({
  content: z.string().trim().min(1, m.skill_report_dialog_content_required()),
  title: z.string().trim().min(1, m.skill_report_dialog_subject_required()),
  type: z.enum(REPORT_TYPES),
});

type ReportFormValues = z.infer<typeof reportSchema>;
type ReportType = ReportFormValues["type"];

interface SkillReportDialogProps {
  skillId: string;
  skillSlug: string;
  skillTitle: string;
}

export const SkillReportDialog = ({ skillId, skillSlug, skillTitle }: SkillReportDialogProps) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const form = useAppForm({
    defaultValues: {
      content: "",
      title: "",
      type: "skill_issue",
    } as ReportFormValues,
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      setSubmitted(false);
      try {
        await orpcClient.feedback.create({
          content: value.content.trim(),
          skillId,
          skillSlug,
          skillTitle,
          title: value.title.trim(),
          type: value.type,
        });
        form.reset({ content: "", title: "", type: "skill_issue" } as ReportFormValues);
        setSubmitted(true);
      } catch {
        setSubmitError(
          value.type === "skill_takedown"
            ? m.skill_report_dialog_takedown_failed()
            : m.skill_report_dialog_failed(),
        );
      }
    },
    validators: {
      onSubmit: reportSchema,
    },
  });

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button className="w-full max-w-md" type="button" variant="outline">
            <FlagIcon aria-hidden className="size-4" />
            {m.skill_report_dialog_trigger()}
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] max-w-2xl! overflow-y-auto border-border/60 bg-background p-0 shadow-2xl">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle className="font-display text-2xl tracking-[-0.03em]">
            {m.skill_report_dialog_title({ skillTitle })}
          </DialogTitle>
          <DialogDescription>{m.skill_report_dialog_description()}</DialogDescription>
        </DialogHeader>

        <form.AppForm>
          <Form className="space-y-6 p-6">
            <form.AppField name="type">
              {(field) => (
                <FormField className="space-y-2">
                  <fieldset className="m-0 min-w-0 space-y-2 p-0">
                    <legend className="font-mono text-xs uppercase text-muted-foreground">
                      {m.skill_report_dialog_type_label()}
                    </legend>
                    <RadioGroup
                      className="grid grid-cols-1 gap-3 md:grid-cols-3"
                      name={field.name}
                      onValueChange={(value) => field.handleChange(value as ReportType)}
                      value={field.state.value}
                    >
                      {REPORT_TYPES.map((type) => {
                        const id = `${field.name}-${type}`;
                        return (
                          <CardLabel key={type} htmlFor={id}>
                            <LayoutField
                              className="border border-foreground/75 px-4 py-3 transition-colors"
                              orientation="horizontal"
                            >
                              <FieldContent className="min-w-0 gap-0">
                                <FieldTitle className="font-mono uppercase">
                                  {reportTypeLabels[type]}
                                </FieldTitle>
                              </FieldContent>
                              <RadioGroupItem id={id} value={type} />
                            </LayoutField>
                          </CardLabel>
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
                  <FieldLabel className="font-mono text-xs uppercase text-muted-foreground">
                    {m.skill_report_dialog_subject_label()}
                  </FieldLabel>
                  <Input
                    className="font-mono text-xs"
                    onChange={(event) => field.handleChange(event.currentTarget.value)}
                    placeholder={m.skill_report_dialog_subject_placeholder()}
                    value={field.state.value}
                  />
                  <FieldError />
                </FormField>
              )}
            </form.AppField>

            <form.AppField name="content">
              {(field) => (
                <FormField className="space-y-2">
                  <FieldLabel className="font-mono text-xs uppercase text-muted-foreground">
                    {m.skill_report_dialog_content_label()}
                  </FieldLabel>
                  <Textarea
                    className="min-h-32 font-mono text-xs"
                    onChange={(event) => field.handleChange(event.currentTarget.value)}
                    placeholder={m.skill_report_dialog_content_placeholder()}
                    value={field.state.value}
                  />
                  <FieldError />
                </FormField>
              )}
            </form.AppField>

            <form.Subscribe selector={(state) => state.values.type}>
              {(type) =>
                type === "skill_takedown" ? (
                  <div className="space-y-3 border border-dashed border-border bg-muted/30 p-4 text-[12px] leading-[1.6] text-muted-foreground">
                    <p>{m.skill_report_dialog_takedown_notice()}</p>
                    <ClaimAuthorButton slug={skillSlug} />
                  </div>
                ) : null
              }
            </form.Subscribe>

            {submitted ? (
              <p className="text-sm text-chart-2">{m.skill_report_dialog_submitted()}</p>
            ) : null}
            {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <div className="flex justify-end pt-2">
                  <Button disabled={!canSubmit || isSubmitting} type="submit">
                    <PaperPlaneTiltIcon aria-hidden className="size-4" />
                    {isSubmitting
                      ? m.skill_report_dialog_submitting()
                      : m.skill_report_dialog_submit()}
                  </Button>
                </div>
              )}
            </form.Subscribe>
          </Form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
};
