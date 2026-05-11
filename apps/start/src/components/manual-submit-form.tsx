// oxlint-disable jsx_a11y/label-has-associated-control
// oxlint-disable no-nested-ternary
import { useState } from "react";

import { useAppForm } from "@/hooks/form-hook";
import { CATEGORY_SLUGS, getCategoryPresentation, getCategoryTitle } from "@/utils/category-data";
import { cn } from "@/lib/utils";
import { localizeHref } from "@/paraglide/runtime";
import { Field, FieldError, FieldLabel, Form } from "@/components/ui/form";
import { z } from "zod/v4";

type Stage = "experimental" | "beta" | "stable";

interface ManualSubmitFormValues {
  classification: string;
  description: string;
  license: string;
  oneLiner: string;
  runtime: string;
  skillName: string;
  stage: Stage;
  tags: string[];
  version: string;
}

const AVAILABLE_TAGS = [
  "review",
  "diff",
  "ci",
  "pr",
  "monorepo",
  "codeowners",
  "silence",
  "github",
  "claude",
  "linter",
];

const STEPS = [
  { num: "i.", label: "Step 01", title: "Metadata" },
  { num: "ii.", label: "Step 02", title: "skill.md & files" },
  { num: "iii.", label: "Step 03", title: "Evals" },
  { num: "iv.", label: "Step 04", title: "Sign & publish" },
];

const STAGE_OPTIONS: { value: Stage; label: string }[] = [
  { value: "experimental", label: "Exptl." },
  { value: "beta", label: "Beta" },
  { value: "stable", label: "Stable" },
];

const OTHER_SELECT_FIELDS = [
  { name: "license", label: "License", options: ["MIT", "Apache-2.0", "CC-BY-SA"] },
  { name: "runtime", label: "Runtime", options: ["Claude / any", "python", "node"] },
] as const;

const INITIAL_VALUES = {
  classification: CATEGORY_SLUGS[0] ?? "",
  description: `The LX-44 reviewer is a high-fidelity diagnostic tool designed for pull requests. Unlike standard linters, it bypasses whitespace entirely, focusing on the behavioral delta of the change — intent drift, test gaps, and small naming opportunities.\n\nShips with structured output for CI, a better story for monorepos, and a tuned silence budget so it doesn't nitpick.`,
  license: "MIT",
  oneLiner: "A diff-first reviewer. Reads a pull request the way a careful colleague would.",
  runtime: "Claude / any",
  skillName: "code-review",
  stage: "stable",
  tags: ["review", "diff", "ci"],
  version: "2.4.1",
} as ManualSubmitFormValues;

const manualSubmitFormSchema = z.object({
  classification: z.string().min(1, "Choose a classification."),
  description: z.string().min(80, "Description must be at least 80 characters."),
  license: z.string().min(1, "Choose a license."),
  oneLiner: z
    .string()
    .min(1, "One-liner is required.")
    .max(140, "Keep the one-liner under 140 characters."),
  runtime: z.string().min(1, "Choose a runtime."),
  skillName: z
    .string()
    .min(1, "Skill name is required.")
    .max(40, "Keep the skill name to 40 characters or fewer."),
  stage: z.enum(["experimental", "beta", "stable"]),
  tags: z.array(z.string()).max(6, "Pick at most 6 tags."),
  version: z.string().min(1, "Version is required."),
});

const getFieldId = (name: keyof ManualSubmitFormValues) => `manual-submit-${name}`;

const buildChecklistItems = (values: ManualSubmitFormValues) => [
  {
    label: "Name is unique & ≤ 40 chars",
    ok: values.skillName.length > 0 && values.skillName.length <= 40,
    display: values.skillName.length > 0 ? "✓ ok" : "✗ required",
  },
  {
    label: "One-liner ≤ 140 chars",
    ok: values.oneLiner.length <= 140 && values.oneLiner.length > 0,
    display: values.oneLiner.length <= 140 ? "✓ ok" : `✗ ${values.oneLiner.length}/140`,
  },
  {
    label: "Description ≥ 80 chars",
    ok: values.description.length >= 80,
    display: values.description.length >= 80 ? "✓ ok" : "✗ too short",
  },
  { label: "Cover image uploaded", ok: false, display: "○ optional" },
  {
    label: "License selected",
    ok: values.license.length > 0,
    display: `✓ ${values.license || "unset"}`,
  },
  { label: "skill.md included (step 2)", ok: false, display: "○ pending" },
  { label: "Evals file included (step 3)", ok: false, display: "○ pending" },
  { label: "PGP signature (step 4)", ok: false, display: "○ pending" },
];

export const ManualSubmitForm = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const classificationOptions = CATEGORY_SLUGS.map((slug, index) => ({
    label: `${getCategoryPresentation(slug, index).num} ${getCategoryTitle(slug)}`,
    value: slug,
  }));

  const form = useAppForm({
    defaultValues: INITIAL_VALUES,
    onSubmit: async () => {
      //
    },
    validators: {
      onChange: manualSubmitFormSchema,
    },
  });

  const inputClass =
    "w-full border border-border bg-paper px-3 py-2.5 font-mono text-[13px] text-ink outline-none focus:border-ink/40 transition-colors";
  const labelClass =
    "mb-1.5 block font-mono text-[10.5px] tracking-[.14em] uppercase text-muted-text";
  const fieldClass = "mb-5";

  return (
    <form.AppForm>
      <div>
        {/* ── Stepper ── */}
        <div className="grid grid-cols-2 border-b-[3px] border-border lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentStep(i)}
              className={cn(
                "flex  items-center gap-3 border-0 px-5 py-4.5 text-left transition-colors",
                // Mobile grid borders
                i % 2 === 0 && "border-r border-border",
                i < 2 && "border-b border-border lg:border-b-0",
                // Desktop: border-r on all except last
                i < 3 && "lg:border-r",
                // Active / visited
                i === currentStep
                  ? "bg-ink text-paper"
                  : i < currentStep
                    ? "bg-paper-2 text-ink"
                    : "bg-transparent text-ink",
              )}
            >
              <span
                className={cn(
                  "font-display shrink-0 text-4xl leading-none italic",
                  i === currentStep
                    ? "text-paper"
                    : i < currentStep
                      ? "text-ink"
                      : "text-muted-text-2",
                )}
              >
                {step.num}
              </span>
              <div>
                <span
                  className={cn(
                    "block font-mono text-[11px] tracking-[.14em] uppercase",
                    i === currentStep ? "text-paper/70" : "text-muted-text",
                  )}
                >
                  {step.label}
                </span>
                <b className="mt-0.5 block font-display text-[19px] font-normal normal-case tracking-normal">
                  {step.title}
                </b>
              </div>
            </button>
          ))}
        </div>

        {/* ── Form + Preview ── */}
        <div className="grid grid-cols-1 border-b border-border lg:grid-cols-2">
          <Form
            autoComplete="on"
            className="border-b border-border px-6 py-10 lg:border-b-0 lg:border-r lg:px-8"
          >
            <h3 className="font-display mb-4.5 border-b border-border pb-2.5 text-3xl font-normal">
              § 01 Metadata
            </h3>

            {/* Skill name */}
            <form.AppField name="skillName">
              {(field) => (
                <Field className={fieldClass}>
                  <FieldLabel htmlFor={getFieldId("skillName")} className={labelClass}>
                    Skill Name — short, lowercase, hyphenated
                  </FieldLabel>
                  <input
                    id={getFieldId("skillName")}
                    type="text"
                    value={field.state.value}
                    onBlur={() => field.handleBlur()}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className={inputClass}
                  />
                  <p className="font-serif mt-1 text-xs italic text-muted-text">
                    This becomes your install string:{" "}
                    <span className="font-mono not-italic">
                      skr install {field.state.value || "my-skill"}
                    </span>
                  </p>
                  <FieldError className="mt-1 font-mono text-[10px] text-destructive" />
                </Field>
              )}
            </form.AppField>

            {/* Version + Stage */}
            <div className={cn(fieldClass, "grid grid-cols-2 gap-4")}>
              <form.AppField name="version">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={getFieldId("version")} className={labelClass}>
                      Version
                    </FieldLabel>
                    <input
                      id={getFieldId("version")}
                      type="text"
                      value={field.state.value}
                      onBlur={() => field.handleBlur()}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className={inputClass}
                    />
                    <FieldError className="mt-1 font-mono text-[10px] text-destructive" />
                  </Field>
                )}
              </form.AppField>
              <form.AppField name="stage">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={getFieldId("stage")} className={labelClass}>
                      Stage
                    </FieldLabel>
                    <div className="flex">
                      {STAGE_OPTIONS.map(({ value, label }, i) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={field.state.value === value}
                          onClick={() => field.handleChange(value)}
                          className={cn(
                            "flex-1  border border-border px-2 py-2.5 font-mono text-[10.5px] tracking-[.14em] uppercase transition-colors",
                            i > 0 && "-ml-px",
                            field.state.value === value
                              ? "relative z-10 bg-ink text-paper"
                              : "text-muted-text hover:bg-paper-2",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </Field>
                )}
              </form.AppField>
            </div>

            {/* One-liner */}
            <form.AppField name="oneLiner">
              {(field) => (
                <Field className={fieldClass}>
                  <FieldLabel htmlFor={getFieldId("oneLiner")} className={labelClass}>
                    One-Liner — what this skill does, in a sentence
                  </FieldLabel>
                  <input
                    id={getFieldId("oneLiner")}
                    type="text"
                    value={field.state.value}
                    onBlur={() => field.handleBlur()}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className={inputClass}
                  />
                  <FieldError className="mt-1 font-mono text-[10px] text-destructive" />
                </Field>
              )}
            </form.AppField>

            {/* Description */}
            <form.AppField name="description">
              {(field) => (
                <Field className={fieldClass}>
                  <FieldLabel htmlFor={getFieldId("description")} className={labelClass}>
                    Full Description — markdown supported
                  </FieldLabel>
                  <textarea
                    id={getFieldId("description")}
                    value={field.state.value}
                    onBlur={() => field.handleBlur()}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className={cn(inputClass, "min-h-28 resize-y leading-relaxed")}
                  />
                  <FieldError className="mt-1 font-mono text-[10px] text-destructive" />
                </Field>
              )}
            </form.AppField>

            {/* Classification / License / Runtime */}
            <div className={cn(fieldClass, "grid grid-cols-1 gap-3 sm:grid-cols-3")}>
              <form.AppField name="classification">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={getFieldId("classification")} className={labelClass}>
                      Classification
                    </FieldLabel>
                    <div className="relative">
                      <select
                        id={getFieldId("classification")}
                        className={cn(inputClass, " appearance-none pr-7")}
                        onBlur={() => field.handleBlur()}
                        onChange={(e) => field.handleChange(e.target.value)}
                        style={{
                          backgroundImage:
                            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2314120e'/%3E%3C/svg%3E\")",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 10px center",
                        }}
                        value={field.state.value}
                      >
                        {classificationOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <FieldError className="mt-1 font-mono text-[10px] text-destructive" />
                  </Field>
                )}
              </form.AppField>
              {OTHER_SELECT_FIELDS.map((fieldConfig) => (
                <form.AppField key={fieldConfig.name} name={fieldConfig.name}>
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={getFieldId(fieldConfig.name)} className={labelClass}>
                        {fieldConfig.label}
                      </FieldLabel>
                      <div className="relative">
                        <select
                          id={getFieldId(fieldConfig.name)}
                          className={cn(inputClass, " appearance-none pr-7")}
                          onBlur={() => field.handleBlur()}
                          onChange={(e) => field.handleChange(e.target.value)}
                          style={{
                            backgroundImage:
                              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2314120e'/%3E%3C/svg%3E\")",
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 10px center",
                          }}
                          value={field.state.value}
                        >
                          {fieldConfig.options.map((opt) => (
                            <option key={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                      <FieldError className="mt-1 font-mono text-[10px] text-destructive" />
                    </Field>
                  )}
                </form.AppField>
              ))}
            </div>

            {/* Tags */}
            <form.AppField name="tags">
              {(field) => (
                <Field className={fieldClass}>
                  <FieldLabel htmlFor={getFieldId("tags")} className={labelClass}>
                    Tags — up to 6
                  </FieldLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        aria-pressed={field.state.value.includes(tag)}
                        onClick={() => {
                          const current = field.state.value;
                          if (current.length >= 6 && !current.includes(tag)) {
                            return;
                          }
                          field.handleChange(
                            current.includes(tag)
                              ? current.filter((value) => value !== tag)
                              : [...current, tag],
                          );
                        }}
                        className={cn(
                          " border border-border px-2 py-1 font-mono text-[10px] tracking-[.08em] uppercase transition-colors",
                          field.state.value.includes(tag)
                            ? "bg-ink text-paper"
                            : "text-ink hover:bg-paper-2",
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <FieldError className="mt-1 font-mono text-[10px] text-destructive" />
                </Field>
              )}
            </form.AppField>

            {/* Cover image drop zone */}
            <div className={fieldClass}>
              <label className={labelClass}>Cover Image</label>
              <div className=" border-2 border-dashed border-border p-7 text-center hover:bg-paper-2 transition-colors">
                <b className="font-display mb-1.5 block text-2xl font-normal">Drop an image</b>
                <span className="font-mono text-xs text-muted-text">
                  16:9 · PNG or JPG · Up to 2MB · The registry crops to fit.
                </span>
              </div>
            </div>
          </Form>

          {/* Preview column */}
          <div className="bg-paper-2 px-6 py-10 lg:px-8">
            <form.Subscribe selector={(state) => state.values}>
              {(values) => {
                const checklistItems = buildChecklistItems(values as ManualSubmitFormValues);

                return (
                  <>
                    <p className="eyebrow mb-4.5 text-muted-text">
                      § Live Preview — how your skill appears in the registry
                    </p>

                    {/* Card preview */}
                    <div className="flex min-h-80 flex-col border border-border bg-paper p-5.5">
                      {/* Cover placeholder */}
                      <div
                        className="-mx-5.5 -mt-5.5 mb-4 flex aspect-video items-center justify-center"
                        style={{
                          background:
                            "repeating-linear-gradient(135deg, rgba(0,0,0,.06) 0 2px, transparent 2px 10px), #0b0a08",
                        }}
                      >
                        <span className="border border-white/10 bg-black/60 px-2 py-1 font-mono text-[10px] tracking-widest uppercase text-[#c8c1af]">
                          your cover image
                        </span>
                      </div>

                      <div className="flex justify-between font-mono text-[10.5px] tracking-[.14em] uppercase text-muted-text">
                        <span>SKILL_ID: CR-44</span>
                        <b className="font-medium text-ink">v.{values.version || "0.0.0"}</b>
                      </div>

                      <h4 className="font-display my-2.5 text-4xl font-normal leading-[1.05]">
                        {values.skillName || "skill-name"}
                      </h4>

                      <p className="font-serif text-sm leading-relaxed text-ink-2">
                        {values.oneLiner || "Your one-liner description goes here."}
                      </p>

                      <div className="mt-auto grid grid-cols-2 gap-3 border-t border-border pt-3 font-mono text-[10px] tracking-[.14em] uppercase text-muted-text">
                        <div>
                          PASS RATE
                          <b className="font-display mt-1 block text-sm font-normal normal-case tracking-normal text-ink">
                            pending eval
                          </b>
                        </div>
                        <div>
                          LATENCY
                          <b className="font-display mt-1 block text-sm font-normal normal-case tracking-normal text-ink">
                            pending eval
                          </b>
                        </div>
                      </div>
                    </div>

                    {/* Checklist */}
                    <div className="mt-6 border-t border-border pt-4.5 font-mono text-[11.5px] leading-loose">
                      {checklistItems.map((item) => (
                        <div key={item.label} className="flex justify-between">
                          <span className="text-ink">{item.label}</span>
                          <span className={item.ok ? "text-editorial-green" : "text-muted-text"}>
                            {item.display}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Style note */}
                    <div className="mt-6 border-t border-border pt-4.5">
                      <b className="eyebrow mb-1 block text-ink">§ Style note</b>
                      <p className="font-serif text-[13px] italic leading-relaxed text-muted-text">
                        The registry deliberately under-formats skill cards. What distinguishes
                        yours is the one-liner. Be specific. "Reads a diff the way a careful
                        colleague would" beats "AI-powered PR review tool" every time.
                      </p>
                    </div>
                  </>
                );
              }}
            </form.Subscribe>
          </div>
        </div>

        {/* ── Footer bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5 lg:px-8">
          <a
            href={localizeHref("/")}
            className="border border-border px-5 py-2.5 font-mono text-[11px] tracking-[.14em] uppercase text-ink no-underline hover:bg-paper-2 transition-colors"
          >
            ← Save draft & exit
          </a>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              className=" border border-border bg-transparent px-5 py-2.5 font-mono text-[11px] tracking-[.14em] uppercase text-ink hover:bg-paper-2 transition-colors"
            >
              Preview registry card
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep((s) => Math.min(s + 1, 3))}
              className=" border-0 bg-ink px-6 py-2.5 font-mono text-[11px] tracking-[.14em] uppercase text-paper hover:opacity-85 transition-opacity"
            >
              Continue to step 0{currentStep + 2} →
            </button>
          </div>
        </div>
      </div>
    </form.AppForm>
  );
};
