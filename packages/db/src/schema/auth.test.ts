/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { accountsTable, authTables, sessionsTable, usersTable, verificationsTable } from "./auth";
import { accountsRelations, sessionsRelations, usersRelations } from "./relations";

describe("auth schema", () => {
  test("exports the auth tables and relations", () => {
    expect(authTables.users).toBe(usersTable);
    expect(authTables.sessions).toBe(sessionsTable);
    expect(authTables.accounts).toBe(accountsTable);
    expect(authTables.verifications).toBe(verificationsTable);
    expect(usersRelations).toBeDefined();
    expect(sessionsRelations).toBeDefined();
    expect(accountsRelations).toBeDefined();
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

    // expect(apikeysTable.id.name).toBe("id");
    // expect(apikeysTable.key.name).toBe("key");
    // expect(apikeysTable.userId.name).toBe("user_id");

    expect(verificationsTable.id.name).toBe("id");
    expect(verificationsTable.identifier.name).toBe("identifier");
    expect(verificationsTable.value.name).toBe("value");
  });
});
