export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  reasoning?: boolean;
  contextWindow?: number;
}

export interface SessionSummary {
  id: string;
  title: string;
  createdAt: number;
  modelId: string;
  workspaceDir: string;
  messageCount: number;
  isStreaming: boolean;
}

export interface ToolCall {
  type: 'toolCall';
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface TextBlock {
  type: 'text';
  text: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'toolResult' | 'system';
  content: (TextBlock | ToolCall | any)[] | string;
  api?: string;
  provider?: string;
  model?: string;
  usage?: {
    input: number;
    output: number;
    totalTokens: number;
  };
  stopReason?: string;
  errorMessage?: string;
  timestamp?: number;
  toolCallId?: string;
  isError?: boolean;
}

export interface SessionDetail {
  id: string;
  title: string;
  createdAt: number;
  model: ModelInfo;
  systemPrompt: string;
  workspaceDir: string;
  state: {
    messages: Message[];
    isStreaming: boolean;
    tools: { name: string; description?: string }[];
    hasQueuedMessages: boolean;
  };
}
