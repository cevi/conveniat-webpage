import { annotateRequest } from '@/lib/request-span';

/**
 * Names the MCP call a request made, on the request's span: `mcp.method` (`tools/call`,
 * `tools/list`, `initialize`, …), `mcp.tool` for a tool call (`updateGenericPage`) and
 * `mcp.status`.
 *
 * Every MCP request is `POST /api/mcp`, so without these a trace could not tell a tool call
 * from the client listing the tools, and a slow one gave no hint what it was doing.
 * `mcp-handler` reports each call through `onEvent`, with the JSON-RPC request as `result`.
 * The tool's arguments stay off the span: they carry the content being written. Which
 * documents a call touched is on the span already, from the collection hooks.
 *
 * @param event - an event of `mcp-handler`, read defensively: its shape is not exported
 */
export const recordMcpEvent = (event: unknown): void => {
  if (typeof event !== 'object' || event === null) return;
  const { type, method, result, status } = event as {
    type?: unknown;
    method?: unknown;
    result?: unknown;
    status?: unknown;
  };

  if (type === 'ERROR') {
    // the message may quote the request, so only that it failed
    annotateRequest({ 'mcp.status': 'error' });
    return;
  }
  if (type !== 'REQUEST_COMPLETED' || typeof method !== 'string') return;

  const parameters =
    typeof result === 'object' && result !== null
      ? (result as { params?: { name?: unknown } }).params
      : undefined;
  const tool =
    method === 'tools/call' && typeof parameters?.name === 'string' ? parameters.name : undefined;

  annotateRequest({
    'mcp.method': method,
    'mcp.tool': tool,
    'mcp.status': typeof status === 'string' ? status : undefined,
  });
};
