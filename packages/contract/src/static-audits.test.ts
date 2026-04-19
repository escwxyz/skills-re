/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { staticAuditsContract, staticAuditSeveritySchema } from "./static-audits";

describe("static audits contract", () => {
  test("exposes the static audit report route", () => {
    expect(staticAuditsContract.getReportBySnapshot).toBeDefined();
  });

  test("accepts the legacy severity enum", () => {
    expect(staticAuditSeveritySchema.parse("high")).toBe("high");
  });
});
