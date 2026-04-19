/* oxlint-disable promise/prefer-await-to-callbacks */

export interface WorkflowStepStubOptions {
  onDo?: (name: string) => void;
}

export const createWorkflowStepStub = (options: WorkflowStepStubOptions = {}) => ({
  async do<T>(name: string, _policy: unknown, callback: () => Promise<T>): Promise<T> {
    options.onDo?.(name);
    return await callback();
  },
});
