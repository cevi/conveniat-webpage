/**
 * Splits a stream of newline-delimited JSON into whole lines, keeping the trailing
 * partial line in the buffer until the chunk that completes it arrives.
 */
export async function* readNdjsonLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // The last element is either an empty string or an incomplete line.
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.trim().length > 0) yield line;
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (buffer.trim().length > 0) yield buffer;
}
