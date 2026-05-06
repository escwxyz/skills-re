import { locales } from "@/paraglide/runtime";

const normalizePathname = (value: string) => value.replace(/\/$/, "") || "/";

const stripLocalePrefix = (value: string) => {
  const normalizedValue = normalizePathname(value);

  for (const locale of locales) {
    const localizedPrefix = `/${locale}`;

    if (normalizedValue === localizedPrefix) {
      return "/";
    }

    if (normalizedValue.startsWith(`${localizedPrefix}/`)) {
      const stripped = normalizedValue.slice(localizedPrefix.length);
      return normalizePathname(stripped);
    }
  }

  return normalizedValue;
};

export const normalizeLocalizedPathname = (value: string) => stripLocalePrefix(value);

export const isActiveLocalizedPath = (currentPathname: string, href: string) => {
  const normalizedCurrentPathname = normalizeLocalizedPathname(currentPathname);
  const normalizedHref = normalizeLocalizedPathname(href);

  if (normalizedHref === "/") {
    return normalizedCurrentPathname === "/";
  }

  return (
    normalizedCurrentPathname === normalizedHref ||
    normalizedCurrentPathname.startsWith(`${normalizedHref}/`)
  );
};
