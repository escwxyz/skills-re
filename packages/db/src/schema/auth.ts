import { relations } from "drizzle-orm";
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

export const apikeysTable = sqliteTable(
  "apikeys",
  {
    id: text("id").primaryKey(),
    configId: text("config_id").default("default").notNull(),
    name: text("name"),
    start: text("start"),
    referenceId: text("reference_id").notNull(),
    prefix: text("prefix"),
    key: text("key").notNull(),
    refillInterval: integer("refill_interval"),
    refillAmount: integer("refill_amount"),
    lastRefillAt: timestampMsColumn("last_refill_at"),
    enabled: integer("enabled", { mode: "boolean" }).default(true),
    rateLimitEnabled: integer("rate_limit_enabled", { mode: "boolean" }).default(true),
    rateLimitTimeWindow: integer("rate_limit_time_window").default(86_400_000),
    rateLimitMax: integer("rate_limit_max").default(10),
    requestCount: integer("request_count").default(0),
    remaining: integer("remaining"),
    lastRequest: timestampMsColumn("last_request"),
    expiresAt: timestampMsColumn("expires_at"),
    createdAt: timestampMsColumn("created_at").notNull(),
    updatedAt: timestampMsColumn("updated_at").notNull(),
    permissions: text("permissions"),
    metadata: text("metadata"),
  },
  (table) => [
    index("apikeys_configId_idx").on(table.configId),
    index("apikeys_referenceId_idx").on(table.referenceId),
    index("apikeys_key_idx").on(table.key),
  ],
);

export const agentHostsTable = sqliteTable(
  "agent_hosts",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    userId: text("user_id")
      .$type<UserId>()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    defaultCapabilities: text("default_capabilities"),
    publicKey: text("public_key"),
    kid: text("kid"),
    jwksUrl: text("jwks_url"),
    enrollmentTokenHash: text("enrollment_token_hash"),
    enrollmentTokenExpiresAt: timestampMsColumn("enrollment_token_expires_at"),
    status: text("status").default("active").notNull(),
    activatedAt: timestampMsColumn("activated_at"),
    expiresAt: timestampMsColumn("expires_at"),
    lastUsedAt: timestampMsColumn("last_used_at"),
    createdAt: timestampMsColumn("created_at").notNull(),
    updatedAt: timestampMsColumn("updated_at").notNull(),
  },
  (table) => [
    index("agentHosts_userId_idx").on(table.userId),
    index("agentHosts_kid_idx").on(table.kid),
    index("agentHosts_enrollmentTokenHash_idx").on(table.enrollmentTokenHash),
    index("agentHosts_status_idx").on(table.status),
  ],
);

export const agentsTable = sqliteTable(
  "agents",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    userId: text("user_id")
      .$type<UserId>()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    hostId: text("host_id")
      .notNull()
      .references(() => agentHostsTable.id, { onDelete: "cascade" }),
    status: text("status").default("active").notNull(),
    mode: text("mode").default("delegated").notNull(),
    publicKey: text("public_key").notNull(),
    kid: text("kid"),
    jwksUrl: text("jwks_url"),
    lastUsedAt: timestampMsColumn("last_used_at"),
    activatedAt: timestampMsColumn("activated_at"),
    expiresAt: timestampMsColumn("expires_at"),
    metadata: text("metadata"),
    createdAt: timestampMsColumn("created_at").notNull(),
    updatedAt: timestampMsColumn("updated_at").notNull(),
  },
  (table) => [
    index("agents_userId_idx").on(table.userId),
    index("agents_hostId_idx").on(table.hostId),
    index("agents_status_idx").on(table.status),
    index("agents_kid_idx").on(table.kid),
  ],
);

export const agentCapabilityGrantsTable = sqliteTable(
  "agent_capability_grants",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agentsTable.id, { onDelete: "cascade" }),
    capability: text("capability").notNull(),
    deniedBy: text("denied_by")
      .$type<UserId>()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    grantedBy: text("granted_by")
      .$type<UserId>()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    expiresAt: timestampMsColumn("expires_at"),
    createdAt: timestampMsColumn("created_at").notNull(),
    updatedAt: timestampMsColumn("updated_at").notNull(),
    status: text("status").default("active").notNull(),
    reason: text("reason"),
    constraints: text("constraints"),
  },
  (table) => [
    index("agentCapabilityGrants_agentId_idx").on(table.agentId),
    index("agentCapabilityGrants_capability_idx").on(table.capability),
    index("agentCapabilityGrants_grantedBy_idx").on(table.grantedBy),
    index("agentCapabilityGrants_status_idx").on(table.status),
  ],
);

export const approvalRequestsTable = sqliteTable(
  "approval_requests",
  {
    id: text("id").primaryKey(),
    method: text("method").notNull(),
    agentId: text("agent_id").references(() => agentsTable.id, { onDelete: "cascade" }),
    hostId: text("host_id").references(() => agentHostsTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .$type<UserId>()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    capabilities: text("capabilities"),
    status: text("status").default("pending").notNull(),
    userCodeHash: text("user_code_hash"),
    loginHint: text("login_hint"),
    bindingMessage: text("binding_message"),
    clientNotificationToken: text("client_notification_token"),
    clientNotificationEndpoint: text("client_notification_endpoint"),
    deliveryMode: text("delivery_mode"),
    interval: integer("interval").notNull(),
    lastPolledAt: timestampMsColumn("last_polled_at"),
    expiresAt: timestampMsColumn("expires_at").notNull(),
    createdAt: timestampMsColumn("created_at").notNull(),
    updatedAt: timestampMsColumn("updated_at").notNull(),
  },
  (table) => [
    index("approvalRequests_agentId_idx").on(table.agentId),
    index("approvalRequests_hostId_idx").on(table.hostId),
    index("approvalRequests_userId_idx").on(table.userId),
    index("approvalRequests_status_idx").on(table.status),
  ],
);

export const authTables = {
  accounts: accountsTable,
  agentCapabilityGrants: agentCapabilityGrantsTable,
  agentHosts: agentHostsTable,
  agents: agentsTable,
  approvalRequests: approvalRequestsTable,
  apikeys: apikeysTable,
  sessions: sessionsTable,
  users: usersTable,
  verifications: verificationsTable,
} as const;

export const agentHostsRelations = relations(agentHostsTable, ({ one, many }) => ({
  users: one(usersTable, {
    fields: [agentHostsTable.userId],
    references: [usersTable.id],
  }),
  agents: many(agentsTable),
  approvalRequests: many(approvalRequestsTable),
}));

export const agentsRelations = relations(agentsTable, ({ one, many }) => ({
  users: one(usersTable, {
    fields: [agentsTable.userId],
    references: [usersTable.id],
  }),
  agentHosts: one(agentHostsTable, {
    fields: [agentsTable.hostId],
    references: [agentHostsTable.id],
  }),
  agentCapabilityGrants: many(agentCapabilityGrantsTable),
  approvalRequests: many(approvalRequestsTable),
}));

export const agentCapabilityGrantsDeniedByRelations = relations(
  agentCapabilityGrantsTable,
  ({ one }) => ({
    users: one(usersTable, {
      fields: [agentCapabilityGrantsTable.deniedBy],
      references: [usersTable.id],
    }),
  }),
);

export const agentCapabilityGrantsGrantedByRelations = relations(
  agentCapabilityGrantsTable,
  ({ one }) => ({
    users: one(usersTable, {
      fields: [agentCapabilityGrantsTable.grantedBy],
      references: [usersTable.id],
    }),
  }),
);

export const agentCapabilityGrantsRelations = relations(agentCapabilityGrantsTable, ({ one }) => ({
  agents: one(agentsTable, {
    fields: [agentCapabilityGrantsTable.agentId],
    references: [agentsTable.id],
  }),
}));

export const approvalRequestsRelations = relations(approvalRequestsTable, ({ one }) => ({
  agents: one(agentsTable, {
    fields: [approvalRequestsTable.agentId],
    references: [agentsTable.id],
  }),
  agentHosts: one(agentHostsTable, {
    fields: [approvalRequestsTable.hostId],
    references: [agentHostsTable.id],
  }),
  users: one(usersTable, {
    fields: [approvalRequestsTable.userId],
    references: [usersTable.id],
  }),
}));
