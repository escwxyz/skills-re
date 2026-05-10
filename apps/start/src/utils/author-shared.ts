export const getAuthorDisplayName = (author: { handle: string; name?: string | null }) =>
  author.name ?? `@${author.handle}`;

export const getAvatarLabel = (author: { handle: string; name?: string | null }) =>
  (author.name ?? author.handle).trim().charAt(0).toUpperCase();
