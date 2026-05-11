import { ImageResponse } from "takumi-js/response";
import type { Font } from "takumi-js";
import { createElement } from "react";

import interTightFontUrl from "@fontsource-variable/inter-tight/files/inter-tight-latin-wght-normal.woff2?url";

import { OG_IMAGE_DEFAULT, SITE_NAME } from "@/lib/constants";
export {
  OG_AUTHORS_IMAGE_PATH,
  OG_CATEGORIES_IMAGE_PATH,
  OG_COLLECTIONS_IMAGE_PATH,
  OG_SKILLS_IMAGE_PATH,
  OG_TAGS_IMAGE_PATH,
  buildAuthorOgImagePath,
  buildCategoryOgImagePath,
  buildCollectionOgImagePath,
  buildSkillOgImagePath,
  buildTagOgImagePath,
} from "@/lib/og-image-paths";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const OG_HEIGHT_TWITTER = 675;
const OG_CACHE_CONTROL = "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400";

const OG_FONT_CACHE = new Map<string, Promise<Font[]>>();

export interface OgMetric {
  label: string;
  value: number | string;
}

export interface OgImageInput {
  accentColor: string;
  description: string;
  eyebrow: string;
  highlight: string;
  identityHandle: string;
  metrics: OgMetric[];
  requestUrl: string;
  title: string;
  twitter?: boolean;
}

const formatMetricValue = (value: number | string) => {
  if (typeof value === "string") {
    return value;
  }

  return new Intl.NumberFormat("en-US", {
    compactDisplay: "short",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
    notation: value >= 1000 ? "compact" : "standard",
  })
    .format(value)
    .toUpperCase();
};

const resolveFontUrl = (fontUrl: string, requestUrl: string) =>
  new URL(fontUrl, requestUrl).toString();

const loadOgFonts = (requestUrl: string) => {
  const { origin } = new URL(requestUrl);
  const existing = OG_FONT_CACHE.get(origin);

  if (existing) {
    return existing;
  }

  const promise = (async () => {
    const resolved = resolveFontUrl(interTightFontUrl, requestUrl);
    const response = await fetch(resolved);

    if (!response.ok) {
      throw new Error(`Failed to load OG font: ${resolved}`);
    }

    return [
      {
        data: await response.arrayBuffer(),
        name: "Inter Tight",
        weight: 400 as const,
      },
    ];
  })();

  OG_FONT_CACHE.set(origin, promise);
  return promise;
};

// Hardcoded theme values matching the light-mode editorial palette in styles.css
const COLORS = {
  bg: "#f9f8f5",
  ink: "#111110",
  muted: "#6b6760",
} as const;

const OgCard = ({
  accentColor,
  description,
  eyebrow,
  highlight,
  identityHandle,
  metrics,
  title,
}: Omit<OgImageInput, "requestUrl" | "twitter">) => {
  const metricItems = metrics.slice(0, 3);

  return createElement(
    "div",
    {
      style: {
        background: COLORS.bg,
        color: COLORS.ink,
        display: "flex",
        fontFamily: '"Inter Tight", sans-serif',
        height: "100%",
        width: "100%",
        position: "relative",
      },
    },
    // Left accent bar
    createElement("div", {
      style: {
        background: accentColor,
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 5,
      },
    }),
    // Main content — 2-section layout: content block at top, footer at bottom
    createElement(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 72px",
          flex: 1,
          marginLeft: 5,
        },
      },
      // Content block: eyebrow row + title + description
      createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 22,
          },
        },
        // Eyebrow row
        createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            },
          },
          createElement(
            "div",
            {
              style: {
                color: accentColor,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              },
            },
            eyebrow,
          ),
          createElement(
            "div",
            {
              style: {
                color: COLORS.muted,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              },
            },
            SITE_NAME,
          ),
        ),
        // Title
        createElement(
          "div",
          {
            style: {
              color: COLORS.ink,
              fontSize: 80,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 0.94,
              maxWidth: 920,
            },
          },
          title,
        ),
        // Description
        createElement(
          "div",
          {
            style: {
              color: COLORS.muted,
              fontSize: 26,
              fontWeight: 400,
              lineHeight: 1.4,
              maxWidth: 880,
            },
          },
          description,
        ),
      ),
      // Footer row: highlight + handle on left, metrics on right
      createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          },
        },
        createElement(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: 5,
            },
          },
          createElement(
            "div",
            {
              style: {
                color: COLORS.muted,
                fontSize: 15,
                fontWeight: 400,
                letterSpacing: "-0.01em",
              },
            },
            highlight,
          ),
          createElement(
            "div",
            {
              style: {
                color: accentColor,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              },
            },
            identityHandle,
          ),
        ),
        metricItems.length > 0 &&
          createElement(
            "div",
            {
              style: {
                display: "flex",
                gap: 40,
                alignItems: "flex-end",
              },
            },
            ...metricItems.map((metric) =>
              createElement(
                "div",
                {
                  key: metric.label,
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 3,
                  },
                },
                createElement(
                  "div",
                  {
                    style: {
                      color: COLORS.ink,
                      fontSize: 34,
                      fontWeight: 700,
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                    },
                  },
                  formatMetricValue(metric.value),
                ),
                createElement(
                  "div",
                  {
                    style: {
                      color: COLORS.muted,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                    },
                  },
                  metric.label,
                ),
              ),
            ),
          ),
      ),
    ),
  );
};

export const createOgImageResponse = async (input: OgImageInput) => {
  try {
    const height = input.twitter ? OG_HEIGHT_TWITTER : OG_HEIGHT;
    const fonts = await loadOgFonts(input.requestUrl).catch(() => []);
    const { requestUrl: _requestUrl, twitter: _twitter, ...cardInput } = input;
    const response = new ImageResponse(createElement(OgCard, cardInput), {
      fonts,
      headers: {
        "Cache-Control": OG_CACHE_CONTROL,
      },
      height,
      width: OG_WIDTH,
    });

    await response.ready;
    return response;
  } catch {
    return await fetch(new URL(OG_IMAGE_DEFAULT, input.requestUrl));
  }
};
