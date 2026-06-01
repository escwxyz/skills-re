// oxlint-disable promise/avoid-new
export type EvalRunTerminalStatus = "blocked" | "cancelled" | "fail";

export type EvalRunErrorCode =
  | "POLICY_BLOCKED"
  | "RUN_CANCELLED"
  | "RUN_TIMEOUT"
  | "SANDBOX_DESTROY_FAILED"
  | "SANDBOX_EXEC_FAILED"
  | "UNKNOWN";

export class EvalRunControlError extends Error {
  readonly code: EvalRunErrorCode;
  readonly terminalStatus: EvalRunTerminalStatus;

  constructor(
    code: EvalRunErrorCode,
    message: string,
    terminalStatus: EvalRunTerminalStatus = "fail",
  ) {
    super(message);
    this.name = "EvalRunControlError";
    this.code = code;
    this.terminalStatus = terminalStatus;
  }
}

export interface SkillEvalSandboxDestroyRuntime {
  destroyRunSandbox(runId: string): Promise<void>;
}

export const normalizeEvalRunError = (error: unknown) => {
  if (error instanceof EvalRunControlError) {
    return {
      code: error.code,
      message: error.message,
      terminalStatus: error.terminalStatus,
    };
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return {
      code: "RUN_CANCELLED" as const,
      message: "Eval run was cancelled.",
      terminalStatus: "cancelled" as const,
    };
  }

  if (error instanceof Error) {
    return {
      code: "SANDBOX_EXEC_FAILED" as const,
      message: error.message,
      terminalStatus: "fail" as const,
    };
  }

  return {
    code: "UNKNOWN" as const,
    message: "Unknown eval run error.",
    terminalStatus: "fail" as const,
  };
};

export const runWithTimeoutAndCancellation = async <T>(input: {
  operation: (signal: AbortSignal) => Promise<T>;
  signal?: AbortSignal;
  timeoutMs: number;
}) => {
  if (input.signal?.aborted) {
    throw new EvalRunControlError("RUN_CANCELLED", "Eval run was cancelled.", "cancelled");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(
      new EvalRunControlError(
        "RUN_TIMEOUT",
        `Eval run exceeded timeout of ${input.timeoutMs}ms.`,
        "fail",
      ),
    );
  }, input.timeoutMs);
  const abortFromParent = () => {
    controller.abort(
      new EvalRunControlError("RUN_CANCELLED", "Eval run was cancelled.", "cancelled"),
    );
  };

  input.signal?.addEventListener("abort", abortFromParent, { once: true });

  try {
    return await Promise.race([
      input.operation(controller.signal),
      new Promise<never>((_resolve, reject) => {
        controller.signal.addEventListener(
          "abort",
          () => {
            reject(controller.signal.reason);
          },
          { once: true },
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout);
    input.signal?.removeEventListener("abort", abortFromParent);
  }
};

export const destroySandboxBestEffort = async (input: {
  runId: string;
  runtime: SkillEvalSandboxDestroyRuntime;
}) => {
  try {
    await input.runtime.destroyRunSandbox(input.runId);
    return {
      destroyed: true,
    };
  } catch (error) {
    const normalized = normalizeEvalRunError(
      error instanceof Error
        ? new EvalRunControlError("SANDBOX_DESTROY_FAILED", error.message, "fail")
        : error,
    );
    return {
      destroyed: false,
      error: normalized,
    };
  }
};
