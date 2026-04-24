import { relations } from "drizzle-orm";

import { accountsTable, sessionsTable, usersTable } from "./auth";
import { categoriesTable } from "./categories";
import { reposTable } from "./repos";
import { reviewsTable } from "./reviews";
import { skillsTable, skillsTagsTable } from "./skills";
import { snapshotFilesTable, snapshotsTable } from "./snapshots";
import { staticAuditsTable } from "./static-audits";
import { tagsTable } from "./tags";

export const usersRelations = relations(usersTable, ({ many }) => ({
  accounts: many(accountsTable),
  sessions: many(sessionsTable),
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

export const categoriesRelations = relations(categoriesTable, () => ({}));

export const reposRelations = relations(reposTable, ({ many }) => ({
  skills: many(skillsTable),
}));

export const skillsRelations = relations(skillsTable, ({ one, many }) => ({
  repo: one(reposTable, {
    fields: [skillsTable.repoId],
    references: [reposTable.id],
  }),
  skillsTags: many(skillsTagsTable),
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
