export interface WorkflowCreateBinding<TPayload> {
  create: (input: { id: string; params: TPayload }) => Promise<{ id: string }>;
}

export const getWorkflowBinding = <TPayload>(
  name: keyof Env,
): WorkflowCreateBinding<TPayload> | null => {
  const binding = globalThis as unknown as Record<string, unknown>;
  return (binding[name as string] as WorkflowCreateBinding<TPayload> | undefined) ?? null;
};

export const enqueueWorkflow = async <TPayload>(input: {
  binding: WorkflowCreateBinding<TPayload>;
  id: string;
  payload: TPayload;
}) => {
  const instance = await input.binding.create({
    id: input.id,
    params: input.payload,
  });

  return { workId: instance.id };
};
