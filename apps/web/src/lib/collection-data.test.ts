/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { formatCollectionPassRate, formatCollectionSkillPassRate } from "./collection-data";

describe("collection-data", () => {
  test("formats skill and collection pass rates from audit data", () => {
    expect(
      formatCollectionSkillPassRate({
        staticAudit: {
          overallScore: 91,
          status: "pass",
        },
      }),
    ).toBe("91%");

    expect(
      formatCollectionSkillPassRate({
        staticAudit: {
          overallScore: 47,
          status: "fail",
        },
      }),
    ).toBe("—");

    expect(
      formatCollectionPassRate([
        {
          staticAudit: {
            overallScore: 91,
            status: "pass",
          },
        },
        {
          staticAudit: {
            overallScore: 47,
            status: "fail",
          },
        },
      ]),
    ).toBe("50%");

    expect(formatCollectionPassRate([])).toBe("—");
  });
});
