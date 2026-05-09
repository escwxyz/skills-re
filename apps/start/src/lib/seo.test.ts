/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { OG_IMAGE_DEFAULT, SITE_URL } from "@/lib/constants";
import { createSeo } from "./seo";

describe("createSeo", () => {
  test("uses the default og image when no image is provided", () => {
    const seo = createSeo({
      canonicalPath: "/skills",
      title: "Browse Skills",
    });

    expect(seo.meta.find((item) => item.property === "og:image")?.content).toBe(
      new URL(OG_IMAGE_DEFAULT, SITE_URL).toString(),
    );
    expect(seo.meta.find((item) => item.name === "twitter:card")?.content).toBe(
      "summary_large_image",
    );
  });

  test("resolves custom og images against the site url", () => {
    const seo = createSeo({
      canonicalPath: "/authors/openai",
      image: "/api/og/author/openai/png",
      title: "OpenAI",
    });

    expect(seo.meta.find((item) => item.property === "og:image")?.content).toBe(
      new URL("/api/og/author/openai/png", SITE_URL).toString(),
    );
    expect(seo.meta.find((item) => item.property === "og:image:width")?.content).toBe("1200");
    expect(seo.meta.find((item) => item.property === "og:image:height")?.content).toBe("630");
  });
});
