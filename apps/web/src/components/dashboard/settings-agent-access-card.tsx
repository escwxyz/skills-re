// oxlint-disable no-nested-ternary
"use client";

import { ArrowRightIcon, RobotIcon } from "@phosphor-icons/react";

import { localizeHref } from "@/paraglide/runtime";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { AgentConfiguration } from "./settings-data";

interface AgentAccessCardProps {
  agentConfiguration: AgentConfiguration | null;
  isLoading: boolean;
}

export function AgentAccessCard({ agentConfiguration, isLoading }: AgentAccessCardProps) {
  return (
    <Card className="rounded-none border-rule/70 bg-background">
      <CardHeader className="border-b border-rule/60 pb-3">
        <CardDescription className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-text">
          Agent access
        </CardDescription>
        <CardTitle className="mt-2 flex items-center gap-2 font-serif text-[1.35rem] leading-none tracking-[-0.03em]">
          <RobotIcon className="size-5 text-muted-text" />
          Discovery and approvals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 py-4">
        <p className="text-[13px] leading-[1.6] text-foreground/80">
          This route now exposes the Better Auth discovery document at
          <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-[12px]">
            /.well-known/agent-configuration
          </code>
          so agents can discover the provider and supported approval methods.
        </p>

        {agentConfiguration ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="border border-rule/70 bg-paper/70 p-4">
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-text">
                Provider
              </p>
              <p className="mt-2 font-serif text-[18px] leading-[1.1]">
                {agentConfiguration.provider_name ?? "skills.re"}
              </p>
              <p className="mt-2 text-[12px] leading-normal text-foreground/70">
                {agentConfiguration.provider_description ??
                  agentConfiguration.description ??
                  "Agent discovery document."}
              </p>
            </div>

            <div className="border border-rule/70 bg-paper/70 p-4">
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-text">
                Modes and approvals
              </p>
              <p className="mt-2 text-[12px] leading-[1.6] text-foreground/70">
                Modes: {(agentConfiguration.modes ?? []).join(", ") || "delegated"}
              </p>
              <p className="text-[12px] leading-[1.6] text-foreground/70">
                Approval methods:{" "}
                {(agentConfiguration.approval_methods ?? []).join(", ") || "device_authorization"}
              </p>
              <p className="text-[12px] leading-[1.6] text-foreground/70">
                Algorithms: {(agentConfiguration.algorithms ?? []).join(", ") || "n/a"}
              </p>
            </div>

            <div className="border border-rule/70 bg-paper/70 p-4">
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-text">
                Discovery path
              </p>
              <p className="mt-2 font-mono text-[12px] leading-[1.6] text-foreground/70">
                {agentConfiguration.default_location ?? "n/a"}
              </p>
              <p className="text-[12px] leading-[1.6] text-foreground/70">
                Issuer: {agentConfiguration.issuer ?? "n/a"}
              </p>
              <p className="text-[12px] leading-[1.6] text-foreground/70">
                Endpoints: {Object.keys(agentConfiguration.endpoints ?? {}).length}
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <p className="text-[13px] leading-normal text-muted-text">
            Loading agent discovery document...
          </p>
        ) : (
          <p className="text-[13px] leading-normal text-muted-text">
            Agent discovery is enabled, but no configuration was returned.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <a
            className={buttonVariants({ size: "sm", variant: "outline" })}
            href={"/.well-known/agent-configuration"}
          >
            Open discovery document
          </a>
          <a
            className={buttonVariants({ size: "sm", variant: "outline" })}
            href={localizeHref("/dashboard")}
          >
            Review dashboard
            <ArrowRightIcon />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
