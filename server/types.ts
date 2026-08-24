import { type ChildProcessWithoutNullStreams } from 'child_process';

export interface RpcSession {
  id: string;
  title: string;
  createdAt: number;
  workspaceDir: string;
  proc: ChildProcessWithoutNullStreams;
  subscribers: Set<(data: any) => void>;
  messages: any[];
  isStreaming: boolean;
  state: any;
  model: any;
}

export interface ModelInfo {
  provider: string;
  id: string;
  name: string;
  context: string;
  maxOut: string;
  thinking: boolean;
}

export interface SessionListItem {
  id: string;
  title: string;
  createdAt: number;
  modelId: string;
  workspaceDir: string;
  messageCount: number;
  isStreaming: boolean;
  sessionPath?: string;
}

export interface CreateSessionParams {
  id?: string;
  title?: string;
  workspaceDir?: string;
  modelId?: string;
  provider?: string;
}

export interface SessionResponse {
  id: string;
  title: string;
  createdAt: number;
  modelId: string;
  workspaceDir: string;
}

export interface GetSessionResponse {
  id: string;
  title: string;
  createdAt: number;
  model: { id: string; name: string };
  workspaceDir: string;
  state: {
    messages: any[];
    isStreaming: boolean;
    tools: { name: string; description: string }[];
    hasQueuedMessages: boolean;
  };
}
