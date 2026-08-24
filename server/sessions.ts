import type { RpcSession, SessionListItem } from './types.js';
import { buildSession } from './rpc.js';

const sessions = new Map<string, RpcSession>();

export function createSession(params: {
  id?: string;
  title?: string;
  workspaceDir?: string;
  modelId?: string;
  provider?: string;
}): RpcSession {
  return buildSession(params, sessions);
}

export function getSession(id: string): RpcSession | undefined {
  return sessions.get(id);
}

export function listSessions(): SessionListItem[] {
  return Array.from(sessions.values()).map((s) => ({
    id: s.id,
    title: s.title,
    createdAt: s.createdAt,
    modelId: s.model?.id ?? 'default',
    workspaceDir: s.workspaceDir,
    messageCount: s.messages.length,
    isStreaming: s.isStreaming,
  }));
}

export function getDefaultSession(): RpcSession | undefined {
  return sessions.get('default-session');
}
