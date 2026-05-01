"use client";

export interface SettingsAlertsProps {
  errorMessage?: string | null;
  statusMessage?: string | null;
}

export function SettingsAlerts({ errorMessage, statusMessage }: SettingsAlertsProps) {
  return (
    <>
      {statusMessage ? (
        <div className="border border-rule bg-secondary/40 px-4 py-3 text-[13px] leading-[1.5] text-foreground/80">
          {statusMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] leading-[1.5] text-destructive">
          {errorMessage}
        </div>
      ) : null}
    </>
  );
}
