/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

process.env.VITE_CLARITY_PROJECT_ID = "clarity-test";
process.env.VITE_GA_MEASURE_ID = "ga-test";
process.env.VITE_SERVER_URL = "https://api.skills.re";
process.env.VITE_SITE_URL = "https://skills.re";

const { createSeo, createSkillDetailSeo } = await import("@/lib/seo");

type SeoResult = ReturnType<typeof createSeo>;

const getMetaContent = (meta: SeoResult["meta"], name: string): string | undefined =>
  meta.find((item) => item.name === name)?.content;

const getCanonicalHref = (links: SeoResult["links"]): string | undefined =>
  links.find((item) => item.rel === "canonical")?.href;

describe("SEO helpers", () => {
  test("normalizes canonical paths by removing trailing slashes except root", () => {
    expect(getCanonicalHref(createSeo({ canonicalPath: "/skills/" }).links)).toBe(
      "https://skills.re/skills",
    );
    expect(
      getCanonicalHref(
        createSeo({ canonicalPath: "/skills/zhjai/agent-arena/agent-arena/" }).links,
      ),
    ).toBe("https://skills.re/skills/zhjai/agent-arena/agent-arena");
    expect(getCanonicalHref(createSeo({ canonicalPath: "/" }).links)).toBe("https://skills.re/");
  });

  test("truncates skill detail descriptions for meta tags", () => {
    const longDescription =
      "Use when the user asks for a second opinion, independent review, sanity check, architecture red-team, red team critique, Codex-vs-Claude debate, GLM-vs-Claude comparison, DeepSeek-vs-Codex review, cross-model comparison, review my plan, challenge this design.";

    const seo = createSkillDetailSeo({
      authorHandle: "zhjai",
      canonicalPath: "/skills/zhjai/agent-arena/agent-arena",
      description: longDescription,
      locale: "en",
      skillTitle: "agent-arena",
    });

    const description = getMetaContent(seo.meta, "description");

    expect(description).toHaveLength(160);
    expect(description).toEndWith("...");
  });
});
