/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { asNewsletterId } from "@skills-re/db/utils";

import { createNewsletterSubscription, findNewsletterByEmail } from "./repo";

describe("newsletter repo", () => {
  test("finds a newsletter record by email", async () => {
    const calls: string[] = [];
    const database = {
      select: () => ({
        from: () => ({
          where: (value: unknown) => {
            calls.push(String(value));
            return {
              limit: () =>
                Promise.resolve([
                  {
                    city: "Berlin",
                    country: "DE",
                    createdAt: 123,
                    device: "desktop",
                    email: "a@example.com",
                    id: asNewsletterId("newsletter-1"),
                    ip: "127.0.0.1",
                  },
                ]),
            };
          },
        }),
      }),
    };

    await expect(findNewsletterByEmail("a@example.com", database as never)).resolves.toEqual({
      city: "Berlin",
      country: "DE",
      createdAt: 123,
      device: "desktop",
      email: "a@example.com",
      id: asNewsletterId("newsletter-1"),
      ip: "127.0.0.1",
    });
    expect(calls).toHaveLength(1);
  });

  test("creates newsletter subscriptions with null-safe defaults", async () => {
    const inserted: unknown[] = [];
    const database = {
      insert: () => ({
        values: (value: unknown) => {
          inserted.push(value);
          return {
            returning: () => [{ id: asNewsletterId("newsletter-1") }],
          };
        },
      }),
    };

    const originalNow = Date.now;
    Date.now = () => 1_700_000_000_000;
    try {
      await expect(
        createNewsletterSubscription(
          {
            city: "Berlin",
            country: null,
            device: "desktop",
            email: "a@example.com",
            ip: null,
          },
          database as never,
        ),
      ).resolves.toEqual(asNewsletterId("newsletter-1"));
    } finally {
      Date.now = originalNow;
    }

    expect(inserted).toEqual([
      {
        city: "Berlin",
        country: null,
        createdAt: 1_700_000_000_000,
        device: "desktop",
        email: "a@example.com",
        ip: null,
      },
    ]);
  });
});
