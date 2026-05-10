export const splitLegacyReviewContent = (content: string, title?: string) => {
  if (title?.trim()) {
    return {
      body: content,
      title: title.trim(),
    };
  }

  const match = content.match(/^\*\*(.+?)\*\*(?:\r?\n){2,}([\s\S]*)$/);
  if (!match) {
    return {
      body: content,
      title: undefined,
    };
  }

  const [, legacyTitle, legacyBody] = match;
  const normalizedTitle = legacyTitle?.trim();
  const normalizedBody = legacyBody?.trim();

  if (!normalizedTitle || !normalizedBody) {
    return {
      body: content,
      title: undefined,
    };
  }

  return {
    body: normalizedBody,
    title: normalizedTitle,
  };
};
