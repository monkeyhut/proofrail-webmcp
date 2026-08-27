type WebMcpJsonSchema = Record<string, unknown>;

type WebMcpTool = {
  name: string;
  title?: string;
  description: string;
  inputSchema?: WebMcpJsonSchema;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
  execute: (
    input: Record<string, unknown>,
    options: { signal: AbortSignal },
  ) => unknown | Promise<unknown>;
};

type WebMcpRegisteredTool = {
  name: string;
  title?: string;
  description: string;
  inputSchema?: WebMcpJsonSchema;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
};

interface WebMcpModelContext extends EventTarget {
  registerTool(
    tool: WebMcpTool,
    options?: { signal?: AbortSignal; exposedTo?: string[] },
  ): Promise<void>;
  getTools(options?: { fromOrigins?: string[] }): Promise<WebMcpRegisteredTool[]>;
  executeTool(
    tool: WebMcpRegisteredTool,
    input?: Record<string, unknown>,
    options?: { signal?: AbortSignal },
  ): Promise<string>;
}

interface Document {
  readonly modelContext?: WebMcpModelContext;
}
