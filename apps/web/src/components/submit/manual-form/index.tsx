"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type Stage = "experimental" | "beta" | "stable";

const AVAILABLE_TAGS = [
  "review", "diff", "ci", "pr", "monorepo", "codeowners",
  "silence", "github", "claude", "linter",
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

const SELECT_FIELDS = [
  { label: "Classification", options: ["01 Code & Craft", "02 Research", "03 Data", "04 Writing"] },
  { label: "License", options: ["MIT", "Apache-2.0", "CC-BY-SA"] },
  { label: "Runtime", options: ["Claude / any", "python", "node"] },
];

export default function ManualSubmitForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [skillName, setSkillName] = useState("code-review");
  const [version, setVersion] = useState("2.4.1");
  const [stage, setStage] = useState<Stage>("stable");
  const [oneLiner, setOneLiner] = useState(
    "A diff-first reviewer. Reads a pull request the way a careful colleague would.",
  );
  const [description, setDescription] = useState(
    `The LX-44 reviewer is a high-fidelity diagnostic tool designed for pull requests. Unlike standard linters, it bypasses whitespace entirely, focusing on the behavioral delta of the change — intent drift, test gaps, and small naming opportunities.\n\nShips with structured output for CI, a better story for monorepos, and a tuned silence budget so it doesn't nitpick.`,
  );
  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    new Set(["review", "diff", "ci"]),
  );

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      if (prev.size >= 6 && !prev.has(tag)) return prev;
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const checklistItems = [
    {
      label: "Name is unique & ≤ 40 chars",
      ok: skillName.length > 0 && skillName.length <= 40,
      display: skillName.length > 0 ? "✓ ok" : "✗ required",
    },
    {
      label: "One-liner ≤ 140 chars",
      ok: oneLiner.length <= 140 && oneLiner.length > 0,
      display: oneLiner.length <= 140 ? "✓ ok" : `✗ ${oneLiner.length}/140`,
    },
    {
      label: "Description ≥ 80 chars",
      ok: description.length >= 80,
      display: description.length >= 80 ? "✓ ok" : "✗ too short",
    },
    { label: "Cover image uploaded", ok: false, display: "○ optional" },
    { label: "License selected", ok: true, display: "✓ MIT" },
    { label: "skill.md included (step 2)", ok: false, display: "○ pending" },
    { label: "Evals file included (step 3)", ok: false, display: "○ pending" },
    { label: "PGP signature (step 4)", ok: false, display: "○ pending" },
  ];

  const inputClass =
    "w-full border border-rule bg-paper px-3 py-2.5 font-mono text-[13px] text-ink outline-none focus:border-ink/40 transition-colors";
  const labelClass =
    "mb-1.5 block font-mono text-[10.5px] tracking-[.14em] uppercase text-muted-text";
  const fieldClass = "mb-5";

  return (
    <div>
      {/* ── Stepper ── */}
      <div className="grid grid-cols-2 border-b-[3px] border-rule lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrentStep(i)}
            className={cn(
              "flex cursor-pointer items-center gap-3 border-0 px-5 py-4.5 text-left transition-colors",
              // Mobile grid borders
              i % 2 === 0 && "border-r border-rule",
              i < 2 && "border-b border-rule lg:border-b-0",
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
      <div className="grid grid-cols-1 border-b border-rule lg:grid-cols-2">
        {/* Form column */}
        <div className="border-b border-rule px-6 py-10 lg:border-b-0 lg:border-r lg:px-8">
          <h3 className="font-display mb-4.5 border-b border-rule pb-2.5 text-3xl font-normal">
            § 01 Metadata
          </h3>

          {/* Skill name */}
          <div className={fieldClass}>
            <label className={labelClass}>
              Skill Name — short, lowercase, hyphenated
            </label>
            <input
              type="text"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              className={inputClass}
            />
            <p className="font-serif mt-1 text-xs italic text-muted-text">
              This becomes your install string:{" "}
              <span className="font-mono not-italic">
                skr install {skillName || "my-skill"}
              </span>
            </p>
          </div>

          {/* Version + Stage */}
          <div className={cn(fieldClass, "grid grid-cols-2 gap-4")}>
            <div>
              <label className={labelClass}>Version</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Stage</label>
              <div className="flex">
                {STAGE_OPTIONS.map(({ value, label }, i) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStage(value)}
                    className={cn(
                      "flex-1 cursor-pointer border border-rule px-2 py-2.5 font-mono text-[10.5px] tracking-[.14em] uppercase transition-colors",
                      i > 0 && "-ml-px",
                      stage === value
                        ? "relative z-10 bg-ink text-paper"
                        : "text-muted-text hover:bg-paper-2",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* One-liner */}
          <div className={fieldClass}>
            <label className={labelClass}>One-Liner — what this skill does, in a sentence</label>
            <input
              type="text"
              value={oneLiner}
              onChange={(e) => setOneLiner(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Description */}
          <div className={fieldClass}>
            <label className={labelClass}>Full Description — markdown supported</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={cn(inputClass, "min-h-28 resize-y leading-relaxed")}
            />
          </div>

          {/* Classification / License / Runtime */}
          <div className={cn(fieldClass, "grid grid-cols-1 gap-3 sm:grid-cols-3")}>
            {SELECT_FIELDS.map((field) => (
              <div key={field.label}>
                <label className={labelClass}>{field.label}</label>
                <div className="relative">
                  <select
                    className={cn(inputClass, "cursor-pointer appearance-none pr-7")}
                    style={{
                      backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2314120e'/%3E%3C/svg%3E\")",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 10px center",
                    }}
                  >
                    {field.options.map((opt) => (
                      <option key={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div className={fieldClass}>
            <label className={labelClass}>Tags — up to 6</label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "cursor-pointer border border-rule px-2 py-1 font-mono text-[10px] tracking-[.08em] uppercase transition-colors",
                    selectedTags.has(tag)
                      ? "bg-ink text-paper"
                      : "text-ink hover:bg-paper-2",
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Cover image drop zone */}
          <div className={fieldClass}>
            <label className={labelClass}>Cover Image</label>
            <div className="cursor-pointer border-2 border-dashed border-rule p-7 text-center hover:bg-paper-2 transition-colors">
              <b className="font-display mb-1.5 block text-2xl font-normal">
                Drop an image
              </b>
              <span className="font-mono text-xs text-muted-text">
                16:9 · PNG or JPG · Up to 2MB · The registry crops to fit.
              </span>
            </div>
          </div>
        </div>

        {/* Preview column */}
        <div className="bg-paper-2 px-6 py-10 lg:px-8">
          <p className="eyebrow mb-4.5 text-muted-text">
            § Live Preview — how your skill appears in the registry
          </p>

          {/* Card preview */}
          <div className="flex min-h-80 flex-col border border-rule bg-paper p-5.5">
            {/* Cover placeholder */}
            <div
              className="-mx-5.5 -mt-5.5 mb-4 flex aspect-video items-center justify-center"
              style={{
                background:
                  "repeating-linear-gradient(135deg, rgba(0,0,0,.06) 0 2px, transparent 2px 10px), #0b0a08",
              }}
            >
              <span className="border border-white/10 bg-black/60 px-2 py-1 font-mono text-[10px] tracking-[.1em] uppercase text-[#c8c1af]">
                your cover image
              </span>
            </div>

            <div className="flex justify-between font-mono text-[10.5px] tracking-[.14em] uppercase text-muted-text">
              <span>SKILL_ID: CR-44</span>
              <b className="font-medium text-ink">v.{version}</b>
            </div>

            <h4 className="font-display my-2.5 text-4xl font-normal leading-[1.05]">
              {skillName || "skill-name"}
            </h4>

            <p className="font-serif text-sm leading-relaxed text-ink-2">
              {oneLiner || "Your one-liner description goes here."}
            </p>

            <div className="mt-auto grid grid-cols-2 gap-3 border-t border-rule pt-3 font-mono text-[10px] tracking-[.14em] uppercase text-muted-text">
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
          <div className="mt-6 border-t border-rule pt-4.5 font-mono text-[11.5px] leading-loose">
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
          <div className="mt-6 border-t border-rule pt-4.5">
            <b className="eyebrow mb-1 block text-ink">§ Style note</b>
            <p className="font-serif text-[13px] italic leading-relaxed text-muted-text">
              The registry deliberately under-formats skill cards. What distinguishes yours is the
              one-liner. Be specific. "Reads a diff the way a careful colleague would" beats
              "AI-powered PR review tool" every time.
            </p>
          </div>
        </div>
      </div>

      {/* ── Footer bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-6 py-5 lg:px-8">
        <a
          href="/"
          className="border border-rule px-5 py-2.5 font-mono text-[11px] tracking-[.14em] uppercase text-ink no-underline hover:bg-paper-2 transition-colors"
        >
          ← Save draft & exit
        </a>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            className="cursor-pointer border border-rule bg-transparent px-5 py-2.5 font-mono text-[11px] tracking-[.14em] uppercase text-ink hover:bg-paper-2 transition-colors"
          >
            Preview registry card
          </button>
          <button
            type="button"
            onClick={() => setCurrentStep((s) => Math.min(s + 1, 3))}
            className="cursor-pointer border-0 bg-ink px-6 py-2.5 font-mono text-[11px] tracking-[.14em] uppercase text-paper hover:opacity-85 transition-opacity"
          >
            Continue to step 0{currentStep + 2} →
          </button>
        </div>
      </div>
    </div>
  );
}
