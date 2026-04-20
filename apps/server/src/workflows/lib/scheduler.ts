import { nanoid } from "nanoid";

export interface WorkflowCreateBinding<TPayload> {
  create: (options?: { id?: string; params?: TPayload }) => Promise<{ id: string }>;
}

export interface WorkflowScheduler<TPayload> {
  enqueue(payload: TPayload): Promise<{ workId: string }>;
}

export const makeWorkflowScheduler = <TPayload>(
  prefix: string,
  binding: WorkflowCreateBinding<TPayload>,
): WorkflowScheduler<TPayload> => ({
  async enqueue(payload) {
    const instance = await binding.create({
      id: `${prefix}-${nanoid()}`,
      params: payload,
    });

    return { workId: instance.id };
  },
});
