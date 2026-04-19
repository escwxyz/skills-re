/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { newsletterContract } from "./newsletter";

describe("newsletter contract", () => {
  test("exposes the create route", () => {
    expect(newsletterContract.create).toBeDefined();
  });
});
