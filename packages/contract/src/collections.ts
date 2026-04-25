import { z } from "zod";

import { baseContract } from "./common/base";
import { collectionDetailSchema, collectionListItemSchema } from "./common/content";
import { idSchema } from "./common/ids";
import { tagSlugSchema } from "./common/slugs";

const collectionSlugInputSchema = z.object({
  slug: tagSlugSchema,
});

const collectionIdInputSchema = z.object({
  id: idSchema,
});

export const setCollectionSkillsInputSchema = z.object({
  collectionId: idSchema,
  skillIds: z
    .array(idSchema)
    .min(0)
    .refine((skillIds) => new Set(skillIds).size === skillIds.length, {
      message: "skillIds must be unique.",
      path: ["skillIds"],
    }),
});

const collectionsListContract = baseContract
  .route({
    description: "Returns the public collection index.",
    method: "GET",
    path: "/collections",
    tags: ["Collections"],
    successDescription: "Public collection list",
    summary: "List public collections",
  })
  .output(z.array(collectionListItemSchema));

const collectionsCountContract = baseContract
  .route({
    description: "Returns the total number of active collections.",
    method: "GET",
    path: "/collections/count",
    tags: ["Collections"],
    successDescription: "Collection count",
    summary: "Count collections",
  })
  .output(z.number().int().nonnegative());

const collectionBySlugContract = baseContract
  .route({
    description: "Returns a collection detail payload, including its curated skills.",
    method: "GET",
    path: "/collections/by-slug",
    tags: ["Collections"],
    successDescription: "Collection detail payload",
    summary: "Read a collection by slug",
  })
  .input(collectionSlugInputSchema)
  .output(collectionDetailSchema.nullable());

const createCollectionContract = baseContract
  .route({
    description: "Creates a new collection owned by the authenticated user.",
    method: "POST",
    path: "/collections",
    tags: ["Collections"],
    successDescription: "Collection created",
    summary: "Create a collection",
  })
  .input(
    z.object({
      description: z.string().min(1),
      slug: tagSlugSchema,
      title: z.string().min(1),
    }),
  )
  .output(z.object({ id: idSchema }));

const updateCollectionContract = baseContract
  .route({
    description: "Updates a collection's metadata. Requires ownership or admin role.",
    method: "PATCH",
    path: "/collections",
    tags: ["Collections"],
    successDescription: "Collection updated",
    summary: "Update a collection",
  })
  .input(
    z.object({
      id: idSchema,
      description: z.string().min(1).optional(),
      slug: tagSlugSchema.optional(),
      status: z.enum(["active", "archived"]).optional(),
      title: z.string().min(1).optional(),
    }),
  )
  .output(z.null());

const deleteCollectionContract = baseContract
  .route({
    description: "Deletes a collection. Requires ownership or admin role.",
    method: "DELETE",
    path: "/collections",
    tags: ["Collections"],
    successDescription: "Collection deleted",
    summary: "Delete a collection",
  })
  .input(collectionIdInputSchema)
  .output(z.null());

const addSkillToCollectionContract = baseContract
  .route({
    description: "Adds a skill to a collection. Requires ownership or admin role.",
    method: "POST",
    path: "/collections/skills",
    tags: ["Collections"],
    successDescription: "Skill added to collection",
    summary: "Add skill to collection",
  })
  .input(
    z.object({
      collectionId: idSchema,
      skillId: idSchema,
      position: z.number().int().nonnegative().optional(),
    }),
  )
  .output(z.null());

const removeSkillFromCollectionContract = baseContract
  .route({
    description: "Removes a skill from a collection. Requires ownership or admin role.",
    method: "DELETE",
    path: "/collections/skills",
    tags: ["Collections"],
    successDescription: "Skill removed from collection",
    summary: "Remove skill from collection",
  })
  .input(
    z.object({
      collectionId: idSchema,
      skillId: idSchema,
    }),
  )
  .output(z.null());

const setCollectionSkillsContract = baseContract
  .route({
    description:
      "Replaces all skills in a collection with the provided ordered list. Requires ownership or admin role.",
    method: "PUT",
    path: "/collections/skills",
    tags: ["Collections"],
    successDescription: "Collection skills updated",
    summary: "Set collection skills",
  })
  .input(setCollectionSkillsInputSchema)
  .output(z.null());

export const collectionsContract = {
  count: collectionsCountContract,
  getBySlug: collectionBySlugContract,
  list: collectionsListContract,
  create: createCollectionContract,
  update: updateCollectionContract,
  delete: deleteCollectionContract,
  addSkill: addSkillToCollectionContract,
  removeSkill: removeSkillFromCollectionContract,
  setSkills: setCollectionSkillsContract,
} as const;
