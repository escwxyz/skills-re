import { useEffect, useRef } from "react";
import type { default as ClarityModule } from "@microsoft/clarity";

import { COOKIE_PREFERENCES_UPDATED_EVENT, getCookiePreferences } from "@/lib/cookies";

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

const isAnalyticsEnabled = async () => {
  const preferences = await getCookiePreferences();
  return preferences?.analytics === true;
};

const setClarityConsent = (clarity: typeof ClarityModule | null, analyticsEnabled: boolean) => {
  if (analyticsEnabled) {
    clarity?.consent(true);
    return;
  }

  if (clarity) {
    clarity.consent(false);
    return;
  }

  if (typeof window.clarity === "function") {
    window.clarity("consent", false);
  }
};

export function ClarityConsent({ projectId }: { projectId?: string | null }) {
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    let isActive = true;
    let clarity: typeof ClarityModule | null = null;

    const syncClarityConsent = async () => {
      const analyticsEnabled = await isAnalyticsEnabled();

      if (!analyticsEnabled) {
        setClarityConsent(clarity, analyticsEnabled);
        return;
      }

      if (!clarity) {
        const clarityModule = await import("@microsoft/clarity");
        if (!isActive) {
          return;
        }

        clarity = clarityModule.default;
      }

      if (!hasInitializedRef.current) {
        clarity.init(projectId);
        hasInitializedRef.current = true;
      }

      setClarityConsent(clarity, analyticsEnabled);
    };

    const handlePreferencesUpdated = async () => {
      try {
        await syncClarityConsent();
      } catch (error) {
        console.error("[clarity] failed to sync updated consent", { error, projectId });
      }
    };

    (async () => {
      try {
        await syncClarityConsent();
      } catch (error) {
        console.error("[clarity] failed to sync consent", { error, projectId });
      }
    })();

    window.addEventListener(COOKIE_PREFERENCES_UPDATED_EVENT, handlePreferencesUpdated);

    return () => {
      isActive = false;
      window.removeEventListener(COOKIE_PREFERENCES_UPDATED_EVENT, handlePreferencesUpdated);
    };
  }, [projectId]);

  return null;
}
