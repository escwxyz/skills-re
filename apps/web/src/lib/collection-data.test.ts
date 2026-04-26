/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  formatCollectionLicenseMix,
  formatCollectionPassRate,
  formatCollectionSkillPassRate,
  formatCollectionTotalDownloads,
  formatCollectionTotalFileSize,
} from "./collection-data";

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

    expect(
      formatCollectionTotalDownloads([{ downloadsAllTime: 1200 }, { downloadsAllTime: 800 }]),
    ).toBe("2K");

    expect(
      formatCollectionTotalFileSize([
        { latestSnapshotTotalBytes: 1536 },
        { latestSnapshotTotalBytes: 512 },
      ]),
    ).toBe("2.0 KB");

    expect(
      formatCollectionLicenseMix([
        { license: "MIT" },
        { license: "Apache-2.0" },
        { license: "MIT" },
      ]),
    ).toBe("MIT · Apache-2.0");
  });
});
