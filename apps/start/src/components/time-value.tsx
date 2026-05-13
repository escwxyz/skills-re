import useRelativeTime, {
  formatRelativeTime,
  shouldUseRelativeTimeHook,
} from "@/hooks/use-relative-time";
import type { Locale } from "@/paraglide/runtime";

export const TimeValue = ({ locale, time }: { locale: Locale; time: number }) => {
  if (shouldUseRelativeTimeHook(time)) {
    return <RelativeTimeLabel locale={locale} time={time} />;
  }

  return <>{formatRelativeTime(time, locale)}</>;
};

const RelativeTimeLabel = ({ locale, time }: { locale: Locale; time: number }) => {
  const label = useRelativeTime(time, locale);

  return <>{label}</>;
};
