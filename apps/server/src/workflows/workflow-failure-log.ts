import { createWorkerLogger } from "../worker-logger";
import type { WorkerLogFields, WorkerLogger } from "../worker-logger";
import { logHandledError } from "../logging";

export const logWorkflowFailure = (input: {
  component: string;
  entrypoint: string;
  instanceId: string;
  logger?: WorkerLogger;
  fields?: WorkerLogFields;
  error: unknown;
  workflowName: string;
}) => {
  const logger =
    input.logger ??
    createWorkerLogger({
      component: input.component,
      entrypoint: input.entrypoint,
      instanceId: input.instanceId,
      workflowName: input.workflowName,
    });

  logHandledError({
    component: input.component,
    error: input.error,
    event: "workflow.failed",
    fields: input.fields,
    logger,
  });
};

export const runWorkflowWithFailureLog = async <T>(input: {
  component?: string;
  entrypoint: string;
  instanceId: string;
  run: () => Promise<T>;
  workflowName: string;
}) => {
  const component = input.component ?? "workflow";
  const logger = createWorkerLogger({
    component,
    entrypoint: input.entrypoint,
    instanceId: input.instanceId,
    workflowName: input.workflowName,
  });

  try {
    return await input.run();
  } catch (error) {
    logWorkflowFailure({
      component,
      entrypoint: input.entrypoint,
      error,
      instanceId: input.instanceId,
      logger,
      workflowName: input.workflowName,
    });
    throw error;
  }
};
