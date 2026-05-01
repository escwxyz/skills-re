import { text } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";

type Brand<T, Name extends string> = T & { readonly __tableName: Name };

export type AccountId = Brand<string, "accounts">;
export type CategoryId = Brand<string, "categories">;
export type CollectionId = Brand<string, "collections">;
export type ApikeyId = Brand<string, "apikeys">;
export type EvaluationId = Brand<string, "evaluations">;
export type FeedbackId = Brand<string, "feedback">;
export type NewsletterId = Brand<string, "newsletter">;
export type ReviewId = Brand<string, "reviews">;
export type RepoId = Brand<string, "repos">;
export type SkillId = Brand<string, "skills">;
export type SavedSkillId = Brand<string, "saved_skills">;
export type OrderId = Brand<string, "orders">;
export type ProductId = Brand<string, "products">;
export type ReservationId = Brand<string, "reservations">;
export type TagId = Brand<string, "tags">;
export type SnapshotId = Brand<string, "snapshots">;
export type StaticAuditId = Brand<string, "static_audits">;
export type UserId = Brand<string, "users">;
export type SessionId = Brand<string, "sessions">;
export type VerificationId = Brand<string, "verifications">;

export const createId = () => nanoid();

export const asAccountId = (value: string) => value as AccountId;
export const asCategoryId = (value: string) => value as CategoryId;
export const asCollectionId = (value: string) => value as CollectionId;
export const asApikeyId = (value: string) => value as ApikeyId;
export const asEvaluationId = (value: string) => value as EvaluationId;
export const asFeedbackId = (value: string) => value as FeedbackId;
export const asNewsletterId = (value: string) => value as NewsletterId;
export const asReviewId = (value: string) => value as ReviewId;
export const asRepoId = (value: string) => value as RepoId;
export const asSkillId = (value: string) => value as SkillId;
export const asSavedSkillId = (value: string) => value as SavedSkillId;
export const asOrderId = (value: string) => value as OrderId;
export const asProductId = (value: string) => value as ProductId;
export const asReservationId = (value: string) => value as ReservationId;
export const asTagId = (value: string) => value as TagId;
export const asSnapshotId = (value: string) => value as SnapshotId;
export const asStaticAuditId = (value: string) => value as StaticAuditId;
export const asUserId = (value: string) => value as UserId;
export const asSessionId = (value: string) => value as SessionId;
export const asVerificationId = (value: string) => value as VerificationId;

export const idColumn = <TId extends string>(name = "id") =>
  text(name)
    .$type<TId>()
    .$defaultFn(() => nanoid() as TId)
    .primaryKey();
