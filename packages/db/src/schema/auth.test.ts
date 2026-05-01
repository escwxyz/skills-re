/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  accountsTable,
  agentCapabilityGrantsTable,
  agentHostsTable,
  agentsTable,
  approvalRequestsTable,
  apikeysTable,
  authTables,
  sessionsTable,
  usersTable,
  verificationsTable,
} from "./auth";
import {
  accountsRelations,
  agentCapabilityGrantsRelations,
  agentHostsRelations,
  agentsRelations,
  approvalRequestsRelations,
  sessionsRelations,
  usersRelations,
} from "./relations";

describe("auth schema", () => {
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

  test("exposes the current auth table columns", () => {
    expect(usersTable.id.name).toBe("id");
    expect(usersTable.email.name).toBe("email");
    expect(usersTable.name.name).toBe("name");
    expect(usersTable.github.name).toBe("github");

    expect(sessionsTable.id.name).toBe("id");
    expect(sessionsTable.token.name).toBe("token");
    expect(sessionsTable.userId.name).toBe("user_id");

    expect(accountsTable.id.name).toBe("id");
    expect(accountsTable.accountId.name).toBe("account_id");
    expect(accountsTable.providerId.name).toBe("provider_id");
    expect(accountsTable.userId.name).toBe("user_id");

    expect(apikeysTable.id.name).toBe("id");
    expect(apikeysTable.key.name).toBe("key");
    expect(apikeysTable.referenceId.name).toBe("reference_id");

    expect(agentHostsTable.id.name).toBe("id");
    expect(agentHostsTable.userId.name).toBe("user_id");

    expect(agentsTable.id.name).toBe("id");
    expect(agentsTable.hostId.name).toBe("host_id");
    expect(agentsTable.publicKey.name).toBe("public_key");

    expect(agentCapabilityGrantsTable.id.name).toBe("id");
    expect(agentCapabilityGrantsTable.agentId.name).toBe("agent_id");
    expect(agentCapabilityGrantsTable.capability.name).toBe("capability");

    expect(approvalRequestsTable.id.name).toBe("id");
    expect(approvalRequestsTable.method.name).toBe("method");
    expect(approvalRequestsTable.userId.name).toBe("user_id");

    expect(verificationsTable.id.name).toBe("id");
    expect(verificationsTable.identifier.name).toBe("identifier");
    expect(verificationsTable.value.name).toBe("value");
  });
});
