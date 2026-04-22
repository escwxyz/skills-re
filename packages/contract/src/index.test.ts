/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { contract } from "./index";

describe("contract composition", () => {
  test("includes snapshots and excludes privateData", () => {
    expect(contract.snapshots).toBeDefined();
    expect(contract.feedback).toBeDefined();
    expect(contract.github).toBeDefined();
    expect(contract.metrics).toBeDefined();
    expect(contract.staticAudits).toBeDefined();
    expect(contract.newsletter).toBeDefined();
    expect(contract.reviews).toBeDefined();
    expect("privateData" in contract).toBe(false);
  });
});
