/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { feedbackContract } from "./feedback";

describe("feedback contract", () => {
  test("exposes the expected routes", () => {
    expect(feedbackContract.create).toBeDefined();
    expect(feedbackContract.getById).toBeDefined();
    expect(feedbackContract.getMineById).toBeDefined();
    expect(feedbackContract.list).toBeDefined();
    expect(feedbackContract.listMine).toBeDefined();
    expect(feedbackContract.updateResponse).toBeDefined();
    expect(feedbackContract.updateStatus).toBeDefined();
  });
});
