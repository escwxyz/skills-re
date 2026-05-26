import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role"),
  banned: integer("banned", { mode: "boolean" }).default(false),
  banReason: text("ban_reason"),
  banExpires: integer("ban_expires", { mode: "timestamp_ms" }),
  bio: text("bio"),
  github: text("github"),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
  },
  (table) => [index("sessions_userId_idx").on(table.userId)],
);

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("accounts_userId_idx").on(table.userId)],
);

export const verifications = sqliteTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

export const apikeys = sqliteTable(
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
    lastRefillAt: integer("last_refill_at", { mode: "timestamp_ms" }),
    enabled: integer("enabled", { mode: "boolean" }).default(true),
    rateLimitEnabled: integer("rate_limit_enabled", {
      mode: "boolean",
    }).default(true),
    rateLimitTimeWindow: integer("rate_limit_time_window").default(86400000),
    rateLimitMax: integer("rate_limit_max").default(10),
    requestCount: integer("request_count").default(0),
    remaining: integer("remaining"),
    lastRequest: integer("last_request", { mode: "timestamp_ms" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    permissions: text("permissions"),
    metadata: text("metadata"),
  },
  (table) => [
    index("apikeys_configId_idx").on(table.configId),
    index("apikeys_referenceId_idx").on(table.referenceId),
    index("apikeys_key_idx").on(table.key),
  ],
);

export const jwkss = sqliteTable("jwkss", {
  id: text("id").primaryKey(),
  publicKey: text("public_key").notNull(),
  privateKey: text("private_key").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
});

export const oauthClients = sqliteTable("oauth_clients", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().unique(),
  clientSecret: text("client_secret"),
  disabled: integer("disabled", { mode: "boolean" }).default(false),
  skipConsent: integer("skip_consent", { mode: "boolean" }),
  enableEndSession: integer("enable_end_session", { mode: "boolean" }),
  subjectType: text("subject_type"),
  scopes: text("scopes", { mode: "json" }),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
  name: text("name"),
  uri: text("uri"),
  icon: text("icon"),
  contacts: text("contacts", { mode: "json" }),
  tos: text("tos"),
  policy: text("policy"),
  softwareId: text("software_id"),
  softwareVersion: text("software_version"),
  softwareStatement: text("software_statement"),
  redirectUris: text("redirect_uris", { mode: "json" }).notNull(),
  postLogoutRedirectUris: text("post_logout_redirect_uris", { mode: "json" }),
  tokenEndpointAuthMethod: text("token_endpoint_auth_method"),
  grantTypes: text("grant_types", { mode: "json" }),
  responseTypes: text("response_types", { mode: "json" }),
  public: integer("public", { mode: "boolean" }),
  type: text("type"),
  requirePKCE: integer("require_pkce", { mode: "boolean" }),
  referenceId: text("reference_id"),
  metadata: text("metadata", { mode: "json" }),
});

export const oauthRefreshTokens = sqliteTable("oauth_refresh_tokens", {
  id: text("id").primaryKey(),
  token: text("token").notNull(),
  clientId: text("client_id")
    .notNull()
    .references(() => oauthClients.clientId, { onDelete: "cascade" }),
  sessionId: text("session_id").references(() => sessions.id, {
    onDelete: "set null",
  }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  referenceId: text("reference_id"),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }),
  revoked: integer("revoked", { mode: "timestamp_ms" }),
  authTime: integer("auth_time", { mode: "timestamp_ms" }),
  scopes: text("scopes", { mode: "json" }).notNull(),
});

export const oauthAccessTokens = sqliteTable("oauth_access_tokens", {
  id: text("id").primaryKey(),
  token: text("token").unique(),
  clientId: text("client_id")
    .notNull()
    .references(() => oauthClients.clientId, { onDelete: "cascade" }),
  sessionId: text("session_id").references(() => sessions.id, {
    onDelete: "set null",
  }),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  referenceId: text("reference_id"),
  refreshId: text("refresh_id").references(() => oauthRefreshTokens.id, {
    onDelete: "cascade",
  }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }),
  scopes: text("scopes", { mode: "json" }).notNull(),
});

export const oauthConsents = sqliteTable("oauth_consents", {
  id: text("id").primaryKey(),
  clientId: text("client_id")
    .notNull()
    .references(() => oauthClients.clientId, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  referenceId: text("reference_id"),
  scopes: text("scopes", { mode: "json" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
});

export const agentHosts = sqliteTable(
  "agent_hosts",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    defaultCapabilities: text("default_capabilities"),
    publicKey: text("public_key"),
    kid: text("kid"),
    jwksUrl: text("jwks_url"),
    enrollmentTokenHash: text("enrollment_token_hash"),
    enrollmentTokenExpiresAt: integer("enrollment_token_expires_at", {
      mode: "timestamp_ms",
    }),
    status: text("status").default("active").notNull(),
    activatedAt: integer("activated_at", { mode: "timestamp_ms" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("agentHosts_userId_idx").on(table.userId),
    index("agentHosts_kid_idx").on(table.kid),
    index("agentHosts_enrollmentTokenHash_idx").on(table.enrollmentTokenHash),
    index("agentHosts_status_idx").on(table.status),
  ],
);

export const agents = sqliteTable(
  "agents",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    hostId: text("host_id")
      .notNull()
      .references(() => agentHosts.id, { onDelete: "cascade" }),
    status: text("status").default("active").notNull(),
    mode: text("mode").default("delegated").notNull(),
    publicKey: text("public_key").notNull(),
    kid: text("kid"),
    jwksUrl: text("jwks_url"),
    lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
    activatedAt: integer("activated_at", { mode: "timestamp_ms" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    metadata: text("metadata"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("agents_userId_idx").on(table.userId),
    index("agents_hostId_idx").on(table.hostId),
    index("agents_status_idx").on(table.status),
    index("agents_kid_idx").on(table.kid),
  ],
);

export const agentCapabilityGrants = sqliteTable(
  "agent_capability_grants",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    capability: text("capability").notNull(),
    deniedBy: text("denied_by").references(() => users.id, {
      onDelete: "cascade",
    }),
    grantedBy: text("granted_by").references(() => users.id, {
      onDelete: "cascade",
    }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
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

export const approvalRequests = sqliteTable(
  "approval_requests",
  {
    id: text("id").primaryKey(),
    method: text("method").notNull(),
    agentId: text("agent_id").references(() => agents.id, {
      onDelete: "cascade",
    }),
    hostId: text("host_id").references(() => agentHosts.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    capabilities: text("capabilities"),
    status: text("status").default("pending").notNull(),
    userCodeHash: text("user_code_hash"),
    loginHint: text("login_hint"),
    bindingMessage: text("binding_message"),
    clientNotificationToken: text("client_notification_token"),
    clientNotificationEndpoint: text("client_notification_endpoint"),
    deliveryMode: text("delivery_mode"),
    interval: integer("interval").notNull(),
    lastPolledAt: integer("last_polled_at", { mode: "timestamp_ms" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("approvalRequests_agentId_idx").on(table.agentId),
    index("approvalRequests_hostId_idx").on(table.hostId),
    index("approvalRequests_userId_idx").on(table.userId),
    index("approvalRequests_status_idx").on(table.status),
  ],
);

export const deviceCodes = sqliteTable("device_codes", {
  id: text("id").primaryKey(),
  deviceCode: text("device_code").notNull(),
  userCode: text("user_code").notNull(),
  userId: text("user_id"),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  status: text("status").notNull(),
  lastPolledAt: integer("last_polled_at", { mode: "timestamp_ms" }),
  pollingInterval: integer("polling_interval"),
  clientId: text("client_id"),
  scope: text("scope"),
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  oauthClients: many(oauthClients),
  oauthRefreshTokens: many(oauthRefreshTokens),
  oauthAccessTokens: many(oauthAccessTokens),
  oauthConsents: many(oauthConsents),
  agentHosts: many(agentHosts),
  agents: many(agents),
  agentCapabilityGrants: many(agentCapabilityGrants),
  approvalRequests: many(approvalRequests),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  users: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  oauthRefreshTokens: many(oauthRefreshTokens),
  oauthAccessTokens: many(oauthAccessTokens),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  users: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const oauthClientsRelations = relations(oauthClients, ({ one, many }) => ({
  users: one(users, {
    fields: [oauthClients.userId],
    references: [users.id],
  }),
  oauthRefreshTokens: many(oauthRefreshTokens),
  oauthAccessTokens: many(oauthAccessTokens),
  oauthConsents: many(oauthConsents),
}));

export const oauthRefreshTokensRelations = relations(oauthRefreshTokens, ({ one, many }) => ({
  oauthClients: one(oauthClients, {
    fields: [oauthRefreshTokens.clientId],
    references: [oauthClients.clientId],
  }),
  sessions: one(sessions, {
    fields: [oauthRefreshTokens.sessionId],
    references: [sessions.id],
  }),
  users: one(users, {
    fields: [oauthRefreshTokens.userId],
    references: [users.id],
  }),
  oauthAccessTokens: many(oauthAccessTokens),
}));

export const oauthAccessTokensRelations = relations(oauthAccessTokens, ({ one }) => ({
  oauthClients: one(oauthClients, {
    fields: [oauthAccessTokens.clientId],
    references: [oauthClients.clientId],
  }),
  sessions: one(sessions, {
    fields: [oauthAccessTokens.sessionId],
    references: [sessions.id],
  }),
  users: one(users, {
    fields: [oauthAccessTokens.userId],
    references: [users.id],
  }),
  oauthRefreshTokens: one(oauthRefreshTokens, {
    fields: [oauthAccessTokens.refreshId],
    references: [oauthRefreshTokens.id],
  }),
}));

export const oauthConsentsRelations = relations(oauthConsents, ({ one }) => ({
  oauthClients: one(oauthClients, {
    fields: [oauthConsents.clientId],
    references: [oauthClients.clientId],
  }),
  users: one(users, {
    fields: [oauthConsents.userId],
    references: [users.id],
  }),
}));

export const agentHostsRelations = relations(agentHosts, ({ one, many }) => ({
  users: one(users, {
    fields: [agentHosts.userId],
    references: [users.id],
  }),
  agents: many(agents),
  approvalRequests: many(approvalRequests),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  users: one(users, {
    fields: [agents.userId],
    references: [users.id],
  }),
  agentHosts: one(agentHosts, {
    fields: [agents.hostId],
    references: [agentHosts.id],
  }),
  agentCapabilityGrants: many(agentCapabilityGrants),
  approvalRequests: many(approvalRequests),
}));

export const agentCapabilityGrantsDeniedByRelations = relations(
  agentCapabilityGrants,
  ({ one }) => ({
    users: one(users, {
      fields: [agentCapabilityGrants.deniedBy],
      references: [users.id],
    }),
  }),
);

export const agentCapabilityGrantsGrantedByRelations = relations(
  agentCapabilityGrants,
  ({ one }) => ({
    users: one(users, {
      fields: [agentCapabilityGrants.grantedBy],
      references: [users.id],
    }),
  }),
);

export const agentCapabilityGrantsRelations = relations(agentCapabilityGrants, ({ one }) => ({
  agents: one(agents, {
    fields: [agentCapabilityGrants.agentId],
    references: [agents.id],
  }),
}));

export const approvalRequestsRelations = relations(approvalRequests, ({ one }) => ({
  agents: one(agents, {
    fields: [approvalRequests.agentId],
    references: [agents.id],
  }),
  agentHosts: one(agentHosts, {
    fields: [approvalRequests.hostId],
    references: [agentHosts.id],
  }),
  users: one(users, {
    fields: [approvalRequests.userId],
    references: [users.id],
  }),
}));
