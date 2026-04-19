export const DEFAULT_INDEXABLE_TAG_MIN_COUNT = 3;

export const isTagIndexable = (count: number, minCount = DEFAULT_INDEXABLE_TAG_MIN_COUNT) =>
  count >= minCount;

export const getIndexableTagMinCount = () => DEFAULT_INDEXABLE_TAG_MIN_COUNT;
