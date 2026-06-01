import { useEffect } from "react";
import type { GoogleAnalyticsConsentParams } from "tanstack-router-ga4";
import { useGoogleAnalytics } from "tanstack-router-ga4";

import type { CookiePreferences } from "@/lib/cookies";
import { COOKIE_PREFERENCES_UPDATED_EVENT, getCookiePreferences } from "@/lib/cookies";

const toConsentParams = (analyticsEnabled: boolean): GoogleAnalyticsConsentParams => ({
  analytics_storage: analyticsEnabled ? "granted" : "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
});

export function GoogleAnalyticsConsent() {
  const { consent } = useGoogleAnalytics();

  useEffect(() => {
    consent("default", toConsentParams(false));

    const syncConsent = async () => {
      const preferences = await getCookiePreferences();
      consent("update", toConsentParams(preferences?.analytics === true));
    };

    const handlePreferencesUpdated = (event: Event) => {
      const { analytics } = (event as CustomEvent<CookiePreferences>).detail;
      consent("update", toConsentParams(analytics));
    };

    (async () => {
      try {
        await syncConsent();
      } catch (error) {
        console.error("[ga4] failed to sync consent", { error });
      }
    })();

    window.addEventListener(COOKIE_PREFERENCES_UPDATED_EVENT, handlePreferencesUpdated);

    return () => {
      window.removeEventListener(COOKIE_PREFERENCES_UPDATED_EVENT, handlePreferencesUpdated);
    };
  }, [consent]);

  return null;
}
