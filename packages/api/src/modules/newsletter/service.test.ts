// oxlint-disable require-await
/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { asNewsletterId } from "@skills-re/db/utils";

import { createNewsletterService } from "./service";

describe("newsletter service", () => {
  test("does not create a duplicate subscription", async () => {
    const calls: string[] = [];
    const service = createNewsletterService({
      findNewsletterByEmail: async (email, _database?) => {
        calls.push(email);
        return {
          city: null,
          country: null,
          createdAt: 123,
          device: null,
          email,
          id: asNewsletterId("newsletter-1"),
          ip: null,
        };
      },
      createNewsletterSubscription: (_input, _database?) => {
        throw new Error("should not create a duplicate newsletter subscription");
      },
    });

    await expect(
      service.create({
        email: "a@example.com",
      }),
    ).resolves.toBeNull();
    expect(calls).toEqual(["a@example.com"]);
  });

  test("creates a subscription when the email is new", async () => {
    const calls: unknown[] = [];
    const service = createNewsletterService({
      createNewsletterSubscription: async (input, _database?) => {
        calls.push(input);
        return asNewsletterId("newsletter-1");
      },
      findNewsletterByEmail: async (_email, _database?) => null,
    });

    await expect(
      service.create({
        city: "Berlin",
        country: "DE",
        device: "desktop",
        email: "a@example.com",
        ip: "127.0.0.1",
      }),
    ).resolves.toBeNull();
    expect(calls).toEqual([
      {
        city: "Berlin",
        country: "DE",
        device: "desktop",
        email: "a@example.com",
        ip: "127.0.0.1",
      },
    ]);
  });
});
