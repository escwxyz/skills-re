// oxlint-disable no-nested-ternary
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RobotIcon } from "@phosphor-icons/react";
import { m } from "@/paraglide/messages";

interface AgentConfiguration {
  provider_name?: string;
  provider_description?: string;
  description?: string;
  modes?: string[];
  approval_methods?: string[];
  algorithms?: string[];
  default_location?: string;
  issuer?: string;
  endpoints?: Record<string, unknown>;
}

const AGENT_CONFIG_QUERY_KEY = ["agent-configuration"] as const;

export function AgentAccessCard() {
  const { data: agentConfiguration, isLoading } = useQuery({
    queryKey: AGENT_CONFIG_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch("/.well-known/agent-configuration");
      if (!response.ok) {
        return null;
      }
      return (await response.json()) as AgentConfiguration;
    },
    // select
  });

  return (
    <Card className="rounded-none border-rule/70 bg-background">
      <CardHeader className="border-b border-rule/60 pb-3">
        <CardDescription className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-text">
          {m.dashboard_settings_agent_eyebrow()}
        </CardDescription>
        <CardTitle className="mt-2 flex items-center gap-2 font-display text-[1.35rem] leading-none tracking-[-0.03em]">
          <RobotIcon className="size-5 text-muted-text" />
          {m.dashboard_settings_agent_title()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 py-4">
        <p className="text-[13px] leading-[1.6] text-foreground/80">
          {m.dashboard_settings_agent_description()}{" "}
          {m.dashboard_settings_agent_discovery_path_prefix()}{" "}
          <code className="mx-1 rounded-none bg-muted px-1.5 py-0.5 text-[12px]">
            /.well-known/agent-configuration
          </code>
        </p>

        {agentConfiguration ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="border border-rule/70 bg-paper/70 p-4">
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-text">
                {m.dashboard_settings_agent_provider_label()}
              </p>
              <p className="mt-2 font-display text-[18px] leading-[1.1]">
                {agentConfiguration.provider_name ??
                  m.dashboard_settings_agent_provider_name_default()}
              </p>
              <p className="mt-2 text-[12px] leading-normal text-foreground/70">
                {agentConfiguration.provider_description ??
                  agentConfiguration.description ??
                  m.dashboard_settings_agent_provider_description_default()}
              </p>
            </div>

            <div className="border border-rule/70 bg-paper/70 p-4">
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-text">
                {m.dashboard_settings_agent_modes_label()}
              </p>
              <p className="mt-2 text-[12px] leading-[1.6] text-foreground/70">
                {m.dashboard_settings_agent_modes({
                  modes:
                    (agentConfiguration.modes ?? []).join(", ") ||
                    m.dashboard_settings_agent_modes_default(),
                })}
              </p>
              <p className="text-[12px] leading-[1.6] text-foreground/70">
                {m.dashboard_settings_agent_approval_methods({
                  methods:
                    (agentConfiguration.approval_methods ?? []).join(", ") ||
                    m.dashboard_settings_agent_approval_methods_default(),
                })}
              </p>
              <p className="text-[12px] leading-[1.6] text-foreground/70">
                {m.dashboard_settings_agent_algorithms({
                  algorithms:
                    (agentConfiguration.algorithms ?? []).join(", ") ||
                    m.dashboard_settings_agent_algorithms_default(),
                })}
              </p>
            </div>

            <div className="border border-rule/70 bg-paper/70 p-4">
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-text">
                {m.dashboard_settings_agent_discovery_path_label()}
              </p>
              <p className="mt-2 font-mono text-[12px] leading-[1.6] text-foreground/70">
                {agentConfiguration.default_location ??
                  m.dashboard_settings_agent_discovery_path_default()}
              </p>
              <p className="text-[12px] leading-[1.6] text-foreground/70">
                {m.dashboard_settings_agent_issuer_label()}{" "}
                {agentConfiguration.issuer ?? m.dashboard_settings_agent_discovery_path_default()}
              </p>
              <p className="text-[12px] leading-[1.6] text-foreground/70">
                {m.dashboard_settings_agent_endpoints({
                  count: Object.keys(agentConfiguration.endpoints ?? {}).length,
                })}
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <p className="text-[13px] leading-normal text-muted-text">
            {m.dashboard_settings_agent_loading()}
          </p>
        ) : (
          <p className="text-[13px] leading-normal text-muted-text">
            {m.dashboard_settings_agent_empty()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
