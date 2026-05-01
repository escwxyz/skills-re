"use client";

import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface CurrentUser {
  email?: string | null;
  github?: string | null;
  id?: string;
  image?: string | null;
  name?: string | null;
}

interface DashboardSectionProps {
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  description: string;
  eyebrow: string;
  title: string;
}

export function DashboardSection({
  actions,
  children,
  className,
  description,
  eyebrow,
  title,
}: DashboardSectionProps) {
  return (
    <Card
      className={cn(
        "rounded-none border-rule/80 bg-paper shadow-[0_10px_40px_rgba(20,18,14,0.05)]",
        className,
      )}
    >
      <CardHeader className="border-b border-rule/60 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardDescription className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-text">
              {eyebrow}
            </CardDescription>
            <CardTitle className="mt-2 font-serif text-[clamp(1.6rem,2.2vw,2.4rem)] leading-[0.96] tracking-[-0.03em] text-foreground">
              {title}
            </CardTitle>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        <CardDescription className="max-w-2xl pt-2 text-[13px] leading-[1.6] text-muted-text">
          {description}
        </CardDescription>
      </CardHeader>
      {children ? <CardContent className="py-4">{children}</CardContent> : null}
    </Card>
  );
}
