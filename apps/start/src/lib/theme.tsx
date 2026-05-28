import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode, SetStateAction } from "react";
import { createTheme } from "ssr-themes";

import {
  COOKIE_PREFERENCES_UPDATED_EVENT,
  clearCookieSync,
  hasFunctionalCookieConsentSync,
} from "@/lib/cookies";
import { APP_THEME_COOKIE_NAME } from "@/lib/consent-cookie-names";

const theme = createTheme({
  cookie: {
    secure: true,
  },
});

export const { encodeVariant, options, registerTheme, parseThemeCookie, themeScript } = theme;

type ThemeChoice = "dark" | "light" | "system";
type ThemeResolved = "dark" | "light";
type ThemeSnapshot = NonNullable<ReturnType<typeof parseThemeCookie>>;

const THEME_COOKIE_OPTIONS = "; path=/; max-age=31536000; samesite=lax; secure";

interface ThemeContextValue {
  forced?: ThemeResolved | undefined;
  resolved?: ThemeResolved | undefined;
  selected?: ThemeChoice | undefined;
  setSelected: (value: SetStateAction<ThemeChoice>) => void;
  system?: ThemeResolved | undefined;
  themes: readonly ThemeChoice[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const defaultThemes = ["dark", "light", "system"] as const;

const getSystemTheme = (): ThemeResolved => {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const resolveTheme = (selected: ThemeChoice, system: ThemeResolved): ThemeResolved =>
  selected === "system" ? system : selected;

const applyThemeToDocument = (resolved: ThemeResolved) => {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
};

const writeThemeCookie = (selected: ThemeChoice, system: ThemeResolved) => {
  const encoded = encodeVariant({
    resolved: resolveTheme(selected, system),
    selected,
    system,
  });

  if (!encoded || typeof document === "undefined") {
    return;
  }

  // oxlint-disable-next-line unicorn/no-document-cookie
  document.cookie = `${APP_THEME_COOKIE_NAME}=${encodeURIComponent(encoded)}${THEME_COOKIE_OPTIONS}`;
};

const clearThemeCookie = () => {
  clearCookieSync(APP_THEME_COOKIE_NAME);
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider.");
  }

  return context;
};

export const ThemeProvider = ({
  children,
  disableTransition: _disableTransition = true,
  forced,
  initial,
}: {
  children?: ReactNode;
  disableTransition?: boolean;
  forced?: ThemeResolved;
  initial?: ThemeSnapshot | undefined;
}) => {
  void _disableTransition;

  const initialSelected = initial?.selected ?? "system";
  const initialSystem = initial?.system ?? getSystemTheme();
  const initialResolved = initial?.resolved ?? resolveTheme(initialSelected, initialSystem);

  const [selected, setSelected] = useState<ThemeChoice>(initialSelected);
  const [system, setSystem] = useState<ThemeResolved>(initialSystem);
  const [resolved, setResolved] = useState<ThemeResolved>(
    forced ?? initialResolved ?? resolveTheme(initialSelected, initialSystem),
  );
  const [functionalConsent, setFunctionalConsent] = useState<boolean>(
    hasFunctionalCookieConsentSync(),
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const nextSystem = media.matches ? "dark" : "light";
      setSystem(nextSystem);
      setResolved(forced ?? resolveTheme(selected, nextSystem));
    };

    handleChange();

    media.addEventListener("change", handleChange);
    return () => {
      media.removeEventListener("change", handleChange);
    };
  }, [forced, selected]);

  useEffect(() => {
    setResolved(forced ?? resolveTheme(selected, system));
  }, [forced, selected, system]);

  useEffect(() => {
    applyThemeToDocument(resolved);
  }, [resolved]);

  useEffect(() => {
    const syncFunctionalConsent = () => {
      const nextFunctionalConsent = hasFunctionalCookieConsentSync();
      setFunctionalConsent(nextFunctionalConsent);

      if (!nextFunctionalConsent) {
        clearThemeCookie();
        return;
      }

      writeThemeCookie(selected, system);
    };

    syncFunctionalConsent();
    window.addEventListener(COOKIE_PREFERENCES_UPDATED_EVENT, syncFunctionalConsent);

    return () => {
      window.removeEventListener(COOKIE_PREFERENCES_UPDATED_EVENT, syncFunctionalConsent);
    };
  }, [selected, system]);

  useEffect(() => {
    if (!functionalConsent) {
      clearThemeCookie();
      return;
    }

    writeThemeCookie(selected, system);
  }, [functionalConsent, selected, system]);

  const setSelectedTheme = useCallback(
    (value: SetStateAction<ThemeChoice>) => {
      const nextSelected = typeof value === "function" ? value(selected) : value;
      const nextResolved = forced ?? resolveTheme(nextSelected, system);

      setSelected(nextSelected);
      setResolved(nextResolved);

      if (!functionalConsent) {
        clearThemeCookie();
        return;
      }

      writeThemeCookie(nextSelected, system);
    },
    [functionalConsent, forced, selected, system],
  );

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      forced,
      resolved,
      selected,
      setSelected: setSelectedTheme,
      system,
      themes: defaultThemes,
    }),
    [forced, resolved, selected, setSelectedTheme, system],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};
