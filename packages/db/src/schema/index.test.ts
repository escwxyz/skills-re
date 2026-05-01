/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  accountsRelations,
  accountsTable,
  agentCapabilityGrantsRelations,
  agentCapabilityGrantsTable,
  agentHostsRelations,
  agentHostsTable,
  agentsRelations,
  agentsTable,
  approvalRequestsRelations,
  approvalRequestsTable,
  apikeysTable,
  authTables,
  newsletterTable,
  sessionsRelations,
  sessionsTable,
  usersRelations,
  usersTable,
  verificationsTable,
  feedbackTable,
  dailyMetricsTable,
  snapshotFilesRelations,
  snapshotFilesTable,
  reposRelations,
  reposTable,
  snapshotsRelations,
  snapshotsTable,
  reviewsRelations,
  reviewsTable,
  staticAuditsRelations,
  staticAuditsTable,
} from "./index";

describe("database schema registry", () => {
  test("exports the snapshot tables and relations", () => {
    expect(snapshotsTable).toBeDefined();
    expect(snapshotFilesTable).toBeDefined();
    expect(snapshotsRelations).toBeDefined();
    expect(snapshotFilesRelations).toBeDefined();
  });

  test("exports the auth tables and relations", () => {
    expect(authTables.users).toBe(usersTable);
    expect(authTables.sessions).toBe(sessionsTable);
    expect(authTables.accounts).toBe(accountsTable);
    expect(authTables.apikeys).toBe(apikeysTable);
    expect(authTables.agentHosts).toBe(agentHostsTable);
    expect(authTables.agents).toBe(agentsTable);
    expect(authTables.agentCapabilityGrants).toBe(agentCapabilityGrantsTable);
    expect(authTables.approvalRequests).toBe(approvalRequestsTable);
    expect(authTables.verifications).toBe(verificationsTable);
    expect(usersRelations).toBeDefined();
    expect(sessionsRelations).toBeDefined();
    expect(accountsRelations).toBeDefined();
    expect(agentHostsRelations).toBeDefined();
    expect(agentsRelations).toBeDefined();
    expect(agentCapabilityGrantsRelations).toBeDefined();
    expect(approvalRequestsRelations).toBeDefined();
  });

  test("exports the repo tables and relations", () => {
    expect(reposTable).toBeDefined();
    expect(reposRelations).toBeDefined();
  });

  test("exports the feedback table", () => {
    expect(feedbackTable).toBeDefined();
  });

  test("exports the daily metrics table", () => {
    expect(dailyMetricsTable).toBeDefined();
  });

  test("exports the newsletter table", () => {
    expect(newsletterTable).toBeDefined();
  });

  test("exports the reviews table and relations", () => {
    expect(reviewsTable).toBeDefined();
    expect(reviewsRelations).toBeDefined();
  });

  test("exports the static audits table and relations", () => {
    expect(staticAuditsTable).toBeDefined();
    expect(staticAuditsRelations).toBeDefined();
  });
});
