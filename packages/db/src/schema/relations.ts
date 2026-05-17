import { relations } from "drizzle-orm";

import {
  accountsTable,
  agentCapabilityGrantsTable,
  agentHostsTable,
  agentsTable,
  approvalRequestsTable,
  sessionsTable,
  usersTable,
} from "./auth";
import { collectionsTable, collectionsSkillsTable } from "./collections";
import { reposTable } from "./repos";
import { sandboxAgentsTable } from "./sandbox-agents";
import { savedSkillsTable } from "./saved-skills";
import { reviewsTable } from "./reviews";
import { skillsTable, skillsTagsTable } from "./skills";
import { skillEvalCasesTable, skillEvalSuitesTable } from "./skill-eval-suites";
import { skillEvalCaseResultsTable, skillEvalRunsTable } from "./skill-eval-runs";
import { snapshotFilesTable, snapshotsTable } from "./snapshots";
import { staticAuditsTable } from "./static-audits";
import { tagsTable } from "./tags";

export const usersRelations = relations(usersTable, ({ many }) => ({
  accounts: many(accountsTable),
  sessions: many(sessionsTable),
  savedSkills: many(savedSkillsTable),
  agentHosts: many(agentHostsTable),
  agents: many(agentsTable),
  agentCapabilityGrantsDeniedBy: many(agentCapabilityGrantsTable, {
    relationName: "agentCapabilityGrants_deniedBy",
  }),
  agentCapabilityGrantsGrantedBy: many(agentCapabilityGrantsTable, {
    relationName: "agentCapabilityGrants_grantedBy",
  }),
  approvalRequests: many(approvalRequestsTable),
  skillEvalRuns: many(skillEvalRunsTable),
}));

export const sessionsRelations = relations(sessionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [sessionsTable.userId],
    references: [usersTable.id],
  }),
}));

export const accountsRelations = relations(accountsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [accountsTable.userId],
    references: [usersTable.id],
  }),
}));

export const agentHostsRelations = relations(agentHostsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [agentHostsTable.userId],
    references: [usersTable.id],
  }),
  agents: many(agentsTable),
  approvalRequests: many(approvalRequestsTable),
}));

export const agentsRelations = relations(agentsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [agentsTable.userId],
    references: [usersTable.id],
  }),
  agentHost: one(agentHostsTable, {
    fields: [agentsTable.hostId],
    references: [agentHostsTable.id],
  }),
  agentCapabilityGrants: many(agentCapabilityGrantsTable),
  approvalRequests: many(approvalRequestsTable),
}));

export const agentCapabilityGrantsRelations = relations(agentCapabilityGrantsTable, ({ one }) => ({
  agent: one(agentsTable, {
    fields: [agentCapabilityGrantsTable.agentId],
    references: [agentsTable.id],
  }),
  deniedBy: one(usersTable, {
    fields: [agentCapabilityGrantsTable.deniedBy],
    references: [usersTable.id],
    relationName: "agentCapabilityGrants_deniedBy",
  }),
  grantedBy: one(usersTable, {
    fields: [agentCapabilityGrantsTable.grantedBy],
    references: [usersTable.id],
    relationName: "agentCapabilityGrants_grantedBy",
  }),
}));

export const approvalRequestsRelations = relations(approvalRequestsTable, ({ one }) => ({
  agent: one(agentsTable, {
    fields: [approvalRequestsTable.agentId],
    references: [agentsTable.id],
  }),
  agentHost: one(agentHostsTable, {
    fields: [approvalRequestsTable.hostId],
    references: [agentHostsTable.id],
  }),
  user: one(usersTable, {
    fields: [approvalRequestsTable.userId],
    references: [usersTable.id],
  }),
}));

export const reposRelations = relations(reposTable, ({ many }) => ({
  skills: many(skillsTable),
}));

export const skillsRelations = relations(skillsTable, ({ one, many }) => ({
  repo: one(reposTable, {
    fields: [skillsTable.repoId],
    references: [reposTable.id],
  }),
  skillsTags: many(skillsTagsTable),
  savedSkills: many(savedSkillsTable),
  skillEvalSuites: many(skillEvalSuitesTable),
  skillEvalCases: many(skillEvalCasesTable),
  skillEvalRuns: many(skillEvalRunsTable),
}));

export const skillsTagsRelations = relations(skillsTagsTable, ({ one }) => ({
  skill: one(skillsTable, {
    fields: [skillsTagsTable.skillId],
    references: [skillsTable.id],
  }),
  tag: one(tagsTable, {
    fields: [skillsTagsTable.tagId],
    references: [tagsTable.id],
  }),
}));

export const snapshotsRelations = relations(snapshotsTable, ({ many, one }) => ({
  files: many(snapshotFilesTable),
  skill: one(skillsTable, {
    fields: [snapshotsTable.skillId],
    references: [skillsTable.id],
  }),
  skillEvalSuites: many(skillEvalSuitesTable),
  skillEvalCases: many(skillEvalCasesTable),
  skillEvalRuns: many(skillEvalRunsTable),
}));

export const snapshotFilesRelations = relations(snapshotFilesTable, ({ one }) => ({
  snapshot: one(snapshotsTable, {
    fields: [snapshotFilesTable.snapshotId],
    references: [snapshotsTable.id],
  }),
}));

export const reviewsRelations = relations(reviewsTable, ({ one }) => ({
  skill: one(skillsTable, {
    fields: [reviewsTable.skillId],
    references: [skillsTable.id],
  }),
  user: one(usersTable, {
    fields: [reviewsTable.userId],
    references: [usersTable.id],
  }),
}));

export const staticAuditsRelations = relations(staticAuditsTable, ({ one }) => ({
  snapshot: one(snapshotsTable, {
    fields: [staticAuditsTable.snapshotId],
    references: [snapshotsTable.id],
  }),
}));

export const tagsRelations = relations(tagsTable, () => ({}));

export const collectionsRelations = relations(collectionsTable, ({ many, one }) => ({
  collectionsSkills: many(collectionsSkillsTable),
  user: one(usersTable, {
    fields: [collectionsTable.userId],
    references: [usersTable.id],
  }),
}));

export const collectionsSkillsRelations = relations(collectionsSkillsTable, ({ one }) => ({
  collection: one(collectionsTable, {
    fields: [collectionsSkillsTable.collectionId],
    references: [collectionsTable.id],
  }),
  skill: one(skillsTable, {
    fields: [collectionsSkillsTable.skillId],
    references: [skillsTable.id],
  }),
}));

export const savedSkillsRelations = relations(savedSkillsTable, ({ one }) => ({
  skill: one(skillsTable, {
    fields: [savedSkillsTable.skillId],
    references: [skillsTable.id],
  }),
  user: one(usersTable, {
    fields: [savedSkillsTable.userId],
    references: [usersTable.id],
  }),
}));

export const sandboxAgentsRelations = relations(sandboxAgentsTable, ({ many }) => ({
  skillEvalRuns: many(skillEvalRunsTable),
}));

export const skillEvalSuitesRelations = relations(skillEvalSuitesTable, ({ many, one }) => ({
  cases: many(skillEvalCasesTable),
  runs: many(skillEvalRunsTable),
  skill: one(skillsTable, {
    fields: [skillEvalSuitesTable.skillId],
    references: [skillsTable.id],
  }),
  snapshot: one(snapshotsTable, {
    fields: [skillEvalSuitesTable.snapshotId],
    references: [snapshotsTable.id],
  }),
}));

export const skillEvalCasesRelations = relations(skillEvalCasesTable, ({ many, one }) => ({
  results: many(skillEvalCaseResultsTable),
  skill: one(skillsTable, {
    fields: [skillEvalCasesTable.skillId],
    references: [skillsTable.id],
  }),
  snapshot: one(snapshotsTable, {
    fields: [skillEvalCasesTable.snapshotId],
    references: [snapshotsTable.id],
  }),
  suite: one(skillEvalSuitesTable, {
    fields: [skillEvalCasesTable.suiteId],
    references: [skillEvalSuitesTable.id],
  }),
}));

export const skillEvalRunsRelations = relations(skillEvalRunsTable, ({ many, one }) => ({
  agent: one(sandboxAgentsTable, {
    fields: [skillEvalRunsTable.agentId],
    references: [sandboxAgentsTable.id],
  }),
  caseResults: many(skillEvalCaseResultsTable),
  createdByUser: one(usersTable, {
    fields: [skillEvalRunsTable.createdBy],
    references: [usersTable.id],
  }),
  skill: one(skillsTable, {
    fields: [skillEvalRunsTable.skillId],
    references: [skillsTable.id],
  }),
  snapshot: one(snapshotsTable, {
    fields: [skillEvalRunsTable.snapshotId],
    references: [snapshotsTable.id],
  }),
  suite: one(skillEvalSuitesTable, {
    fields: [skillEvalRunsTable.suiteId],
    references: [skillEvalSuitesTable.id],
  }),
}));

export const skillEvalCaseResultsRelations = relations(skillEvalCaseResultsTable, ({ one }) => ({
  case: one(skillEvalCasesTable, {
    fields: [skillEvalCaseResultsTable.caseId],
    references: [skillEvalCasesTable.id],
  }),
  run: one(skillEvalRunsTable, {
    fields: [skillEvalCaseResultsTable.runId],
    references: [skillEvalRunsTable.id],
  }),
}));
