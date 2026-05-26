/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { ORPCError } from "@orpc/server";

import { FeedbackCreateError } from "../modules";
import {
  canCreateFeedbackAnonymously,
  mapCollectionReadError,
  mapCreateFeedbackError,
} from "./index";

describe("feedback create auth gate", () => {
  test("allows anonymous Skill reports only", () => {
    expect(canCreateFeedbackAnonymously("skill_issue")).toBe(true);
    expect(canCreateFeedbackAnonymously("skill_display")).toBe(true);
    expect(canCreateFeedbackAnonymously("skill_takedown")).toBe(true);
    expect(canCreateFeedbackAnonymously("bug")).toBe(false);
    expect(canCreateFeedbackAnonymously("request")).toBe(false);
    expect(canCreateFeedbackAnonymously("general")).toBe(false);
    expect(canCreateFeedbackAnonymously(undefined)).toBe(false);
    expect(canCreateFeedbackAnonymously(null)).toBe(false);
  });

  test("maps structured feedback errors to ORPC errors", () => {
    const mapped = mapCreateFeedbackError(
      new FeedbackCreateError("BAD_REQUEST", "Skill not found."),
    );

    expect(mapped).toBeInstanceOf(ORPCError);
    expect(mapped?.code).toBe("BAD_REQUEST");
    expect(mapped?.message).toBe("Skill not found.");
    expect(mapCreateFeedbackError(new Error("unexpected"))).toBeNull();
  });

  test("maps collection read errors to stable ORPC errors", () => {
    const notFound = mapCollectionReadError(new Error("Collection not found."));
    const forbidden = mapCollectionReadError(
      new Error("Forbidden: you do not own this collection."),
    );

    expect(notFound).toBeInstanceOf(ORPCError);
    expect(notFound?.code).toBe("NOT_FOUND");
    expect(notFound?.message).toBe("Collection not found.");
    expect(forbidden).toBeInstanceOf(ORPCError);
    expect(forbidden?.code).toBe("FORBIDDEN");
    expect(forbidden?.message).toBe("Forbidden: you do not own this collection.");
    expect(mapCollectionReadError(new Error("unexpected"))).toBeNull();
  });
});
