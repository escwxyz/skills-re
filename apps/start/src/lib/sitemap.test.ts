/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { buildSitemapSkillsPagePath, parseSitemapSkillsPageParam } from "@/lib/sitemap";

describe("sitemap helpers", () => {
  test("parses generated skills sitemap page paths", () => {
    expect(parseSitemapSkillsPageParam("1")).toBe(1);
    expect(parseSitemapSkillsPageParam("1.xml")).toBe(1);
    expect(parseSitemapSkillsPageParam(buildSitemapSkillsPagePath(2).split("/").at(-1) ?? "")).toBe(
      2,
    );
  });

  test("rejects invalid skills sitemap page params", () => {
    expect(parseSitemapSkillsPageParam("0")).toBeNull();
    expect(parseSitemapSkillsPageParam("1.xml.xml")).toBeNull();
    expect(parseSitemapSkillsPageParam("page-1.xml")).toBeNull();
  });
});
