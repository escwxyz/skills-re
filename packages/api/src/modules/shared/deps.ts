export const createDepGetter =
  <Deps extends object>(overrides: Partial<Deps>, getDefaultDeps: () => Promise<Deps>) =>
  async <Key extends keyof Deps>(key: Key): Promise<Deps[Key]> => {
    const override = overrides[key];
    if (override !== undefined) {
      return override;
    }
    const deps = await getDefaultDeps();
    return deps[key];
  };
