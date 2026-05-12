import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  variant?: "default" | "solid" | "accent";
}

const variantClasses = {
  accent:
    "bg-[var(--destructive)] border-[var(--destructive)] text-[var(--destructive-foreground)]",
  default: "bg-transparent border-[var(--border)] text-[var(--foreground)]",
  solid: "bg-[var(--foreground)] border-[var(--foreground)] text-[var(--background)]",
} as const;

export const SkillTag = ({ children, variant = "default" }: Props) => (
  <span
    className={`inline-block border border-solid font-mono text-[10px] tracking-[0.08em] px-1.75 py-0.75 uppercase ${variantClasses[variant]}`}
  >
    {children}
  </span>
);
