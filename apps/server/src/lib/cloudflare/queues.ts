export interface QueueBinding<TMessage> {
  send(
    message: TMessage,
    options?: {
      delaySeconds?: number;
    },
  ): Promise<unknown>;
}

export const CLOUDFLARE_QUEUE_MAX_MESSAGE_BYTES = 128_000;

const getUtf8ByteLength = (value: string) => new TextEncoder().encode(value).byteLength;

export const assertQueueMessageSize = <TMessage>(input: {
  context?: string;
  maxBytes?: number;
  message: TMessage;
}) => {
  const limit = input.maxBytes ?? CLOUDFLARE_QUEUE_MAX_MESSAGE_BYTES;
  let serialized: string;
  try {
    serialized = JSON.stringify(input.message);
  } catch (error) {
    throw new Error(
      `[queue:validate-size] ${input.context ?? "queue-message"} is not JSON-serializable: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    );
  }

  const messageBytes = getUtf8ByteLength(serialized);
  if (messageBytes > limit) {
    throw new Error(
      `[queue:validate-size] ${
        input.context ?? "queue-message"
      } length of ${messageBytes} bytes exceeds limit of ${limit}`,
    );
  }

  return messageBytes;
};

export const enqueueQueueMessage = async <TMessage>(input: {
  binding: QueueBinding<TMessage>;
  context?: string;
  delaySeconds?: number;
  message: TMessage;
}) => {
  assertQueueMessageSize({
    context: input.context,
    message: input.message,
  });
  await input.binding.send(input.message, {
    delaySeconds: input.delaySeconds,
  });
};
