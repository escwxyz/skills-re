export const recordSkillView = async (input: { path?: string; skillId: string }) => {
  const response = await fetch(`/api/skills/${encodeURIComponent(input.skillId)}/view`, {
    body: JSON.stringify({
      path: input.path,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to record skill view.");
  }
};
