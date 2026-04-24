import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { baseTableColumns, timestampMsColumn } from "../utils";
import type { AccountId, SessionId, UserId, VerificationId } from "../utils";

export const usersTable = sqliteTable(
  "users",
  {
    ...baseTableColumns<UserId>(),
    banExpires: timestampMsColumn("ban_expires"),
    banReason: text("ban_reason"),
    banned: integer("banned", { mode: "boolean" }).default(false),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
    github: text("github"),
    image: text("image"),
    name: text("name").notNull(),
    role: text("role"),
  },
  (table) => [index("users_github_idx").on(table.github)],
);

export const sessionsTable = sqliteTable(
  "sessions",
  {
    ...baseTableColumns<SessionId>(),
    expiresAt: timestampMsColumn("expires_at").notNull(),
    impersonatedBy: text("impersonated_by"),
    ipAddress: text("ip_address"),
    token: text("token").notNull().unique(),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .$type<UserId>()
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
  },
  (table) => [index("sessions_userId_idx").on(table.userId)],
);

export const accountsTable = sqliteTable(
  "accounts",
  {
    ...baseTableColumns<AccountId>(),
    accessToken: text("access_token"),
    accessTokenExpiresAt: timestampMsColumn("access_token_expires_at"),
    accountId: text("account_id").notNull(),
    idToken: text("id_token"),
    password: text("password"),
    providerId: text("provider_id").notNull(),
    refreshToken: text("refresh_token"),
    refreshTokenExpiresAt: timestampMsColumn("refresh_token_expires_at"),
    scope: text("scope"),
    userId: text("user_id")
      .$type<UserId>()
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
  },
  (table) => [index("accounts_userId_idx").on(table.userId)],
);

export const verificationsTable = sqliteTable(
  "verifications",
  {
    ...baseTableColumns<VerificationId>(),
    expiresAt: timestampMsColumn("expires_at").notNull(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

// export const apikeysTable = sqliteTable(
//   "apikeys",
//   {
//     ...baseTableColumns<ApikeyId>(),
//     enabled: integer("enabled", { mode: "boolean" }).default(true),
//     expiresAt: timestampMsColumn("expires_at"),
//     key: text("key").notNull(),
//     lastRefillAt: timestampMsColumn("last_refill_at"),
//     lastRequest: timestampMsColumn("last_request"),
//     metadata: text("metadata"),
//     name: text("name"),
//     permissions: text("permissions"),
//     prefix: text("prefix"),
//     rateLimitEnabled: integer("rate_limit_enabled", { mode: "boolean" }).default(true),
//     rateLimitMax: integer("rate_limit_max").default(10),
//     rateLimitTimeWindow: integer("rate_limit_time_window").default(86_400_000),
//     refillAmount: integer("refill_amount"),
//     refillInterval: integer("refill_interval"),
//     remaining: integer("remaining"),
//     requestCount: integer("request_count").default(0),
//     start: text("start"),
//     updatedAt: timestampMsColumn("updated_at").default(currentTimestampMs).notNull(),
//     userId: text("user_id")
//       .$type<UserId>()
//       .notNull()
//       .references(() => usersTable.id, { onDelete: "cascade" }),
//   },
//   (table) => [index("apikeys_key_idx").on(table.key), index("apikeys_userId_idx").on(table.userId)],
// );

export const authTables = {
  accounts: accountsTable,
  // apikeys: apikeysTable,
  sessions: sessionsTable,
  users: usersTable,
  verifications: verificationsTable,
} as const;

// export const apikeysRelations = relations(apikeysTable, ({ one }) => ({
//   user: one(usersTable, {
//     fields: [apikeysTable.userId],
//     references: [usersTable.id],
//   }),
// }));
