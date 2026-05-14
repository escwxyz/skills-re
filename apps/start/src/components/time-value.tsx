import useRelativeTime, {
  formatRelativeTime,
  shouldUseRelativeTimeHook,
} from "@/hooks/use-relative-time";
import type { Locale } from "@/paraglide/runtime";

export type TimeValueInput = number | string | Date;

export const resolveTimeValueTimestamp = (time: TimeValueInput) => {
  if (typeof time === "number") {
    return Number.isFinite(time) ? time : null;
  }

  if (time instanceof Date) {
    const timestamp = time.getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  const timestamp = Date.parse(time);
  return Number.isFinite(timestamp) ? timestamp : null;
};

export const TimeValue = ({ locale, time }: { locale: Locale; time: TimeValueInput }) => {
  const timestamp = resolveTimeValueTimestamp(time);

  if (timestamp === null) {
    return <>—</>;
  }

  if (shouldUseRelativeTimeHook(timestamp)) {
    return <RelativeTimeLabel locale={locale} time={time} />;
  }

  return <>{formatRelativeTime(timestamp, locale)}</>;
};

const RelativeTimeLabel = ({ locale, time }: { locale: Locale; time: TimeValueInput }) => {
  const timestamp = resolveTimeValueTimestamp(time);

  if (timestamp === null) {
    return <>—</>;
  }

  const label = useRelativeTime(timestamp, locale);

  return <>{label}</>;
};
