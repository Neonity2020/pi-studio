import type { RpcSession, SessionListItem } from './types.js';
import { buildSession } from './rpc.js';
import { listPersistentSessions } from './storage.js';

// Active RPC session instances
const memorySessions = new Map<string, RpcSession>();

export function createSession(params: {
  id?: string;
  title?: string;
  workspaceDir?: string;
  modelId?: string;
  provider?: string;
}): RpcSession {
  return buildSession(params, memorySessions);
}

export function getSession(id: string): RpcSession | undefined {
  return memorySessions.get(id);
}

export async function listAllSessions(cwd: string = process.cwd()): Promise<SessionListItem[]> {
  const diskSessions = await listPersistentSessions(cwd);
  const result: SessionListItem[] = [];
  const visitedIds = new Set<string>();

  // 1. Prioritize active memory sessions
  for (const s of memorySessions.values()) {
    visitedIds.add(s.id);
    result.push({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt,
      modelId: s.model?.id ?? 'default',
      workspaceDir: s.workspaceDir,
      messageCount: s.messages.length,
      isStreaming: s.isStreaming,
      sessionPath: (s as any).sessionPath,
    });
  }

  // 2. Append sessions stored on disk from Pi ~/.pi/agent/sessions/
  for (const ds of diskSessions) {
    if (!visitedIds.has(ds.id)) {
      visitedIds.add(ds.id);
      result.push({
        id: ds.id,
        title: ds.title,
        createdAt: ds.createdAt,
        modelId: ds.modelId ?? 'default',
        workspaceDir: ds.cwd || cwd,
        messageCount: ds.messageCount,
        isStreaming: false,
        sessionPath: ds.path,
      });
    }
  }

  // Sort by createdAt descending
  return result.sort((a, b) => b.createdAt - a.createdAt);
}

export async function switchSessionTo(sessionPath: string, workspaceDir: string = process.cwd()): Promise<RpcSession> {
  // Check if already open
  for (const s of memorySessions.values()) {
    if ((s as any).sessionPath === sessionPath) {
      return s;
    }
  }

  // Use the default or create a proxy instance
  const defaultSess = memorySessions.get('default-session') || createSession({ workspaceDir });

  return new Promise((resolve) => {
    // Send switch_session command
    defaultSess.proc.stdin.write(
      JSON.stringify({
        id: `switch_${Date.now()}`,
        type: 'switch_session',
        sessionPath,
      }) + '\n',
    );

    // Wait short delay for switch & messages to load
    setTimeout(() => {
      defaultSess.proc.stdin.write(
        JSON.stringify({
          id: `get_msgs_${Date.now()}`,
          type: 'get_messages',
        }) + '\n',
      );
      setTimeout(() => {
        resolve(defaultSess);
      }, 250);
    }, 200);
  });
}

export function getDefaultSession(): RpcSession | undefined {
  return memorySessions.get('default-session');
}
