import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import readline from 'readline';
import type { RpcSession } from './types.js';

export function buildSession(
  params: {
    id?: string;
    title?: string;
    workspaceDir?: string;
    modelId?: string;
    provider?: string;
  },
  sessions: Map<string, RpcSession>,
): RpcSession {
  const id = params.id ?? `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const workspaceDir = params.workspaceDir ?? process.cwd();

  const args = ['--mode', 'rpc'];
  if (params.provider && params.modelId) {
    args.push('--provider', params.provider, '--model', params.modelId);
  } else if (params.modelId) {
    if (params.modelId.includes('/')) {
      args.push('--model', params.modelId);
    } else {
      // Avoid ambiguity by defaulting provider prefix
      args.push('--provider', 'opencode-go', '--model', params.modelId);
    }
  }

  const proc = spawn('pi', args, {
    cwd: workspaceDir,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  const session: RpcSession = {
    id,
    title: params.title ?? 'Pi Agent Session',
    createdAt: Date.now(),
    workspaceDir,
    proc,
    subscribers: new Set(),
    messages: [],
    isStreaming: false,
    state: {},
    model: null,
  };

  const rl = readline.createInterface({ input: proc.stdout });

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const json = JSON.parse(trimmed);

      // Handle RPC response
      if (json.type === 'response') {
        if (json.command === 'get_state' && json.data) {
          session.state = json.data;
          session.model = json.data.model;
        } else if (json.command === 'get_messages' && json.data) {
          session.messages = json.data.messages || [];
        }
      }

      // Handle lifecycle events
      if (json.type === 'agent_start') {
        session.isStreaming = true;
      } else if (json.type === 'agent_end' || json.type === 'agent_settled') {
        session.isStreaming = false;
        if (json.messages && json.messages.length > 0) {
          session.messages = json.messages;
        }
      } else if (json.type === 'message_start') {
        if (json.message) {
          const existsIndex = session.messages.findIndex(
            (m) => m.timestamp === json.message.timestamp && m.role === json.message.role,
          );
          if (existsIndex < 0) {
            session.messages.push(json.message);
          }
        }
      } else if (json.type === 'message_end') {
        if (json.message) {
          const existsIndex = session.messages.findIndex(
            (m) => m.timestamp === json.message.timestamp && m.role === json.message.role,
          );
          if (existsIndex >= 0) {
            session.messages[existsIndex] = json.message;
          } else {
            session.messages.push(json.message);
          }
        }
      } else if (json.type === 'tool_execution_end') {
        if (json.toolResult) {
          session.messages.push({
            role: 'toolResult',
            toolCallId: json.toolCallId || json.id,
            content: json.toolResult.content || json.toolResult,
            isError: json.toolResult.isError || false,
            timestamp: Date.now(),
          });
        }
      }

      // Forward to SSE clients
      for (const sub of session.subscribers) {
        sub(json);
      }
    } catch {
      // Non-JSON output (warnings etc.)
    }
  });

  proc.stderr.on('data', (d) => {
    const errText = d.toString();
    if (errText.includes('Warning:')) return;
    console.error(`[PI-RPC ${id} STDERR]`, errText);
  });

  proc.on('close', (code) => {
    console.log(`[PI-RPC ${id}] Exited with code ${code}`);
  });

  // Query initial state
  proc.stdin.write(JSON.stringify({ id: 'init_state', type: 'get_state' }) + '\n');

  sessions.set(id, session);
  return session;
}
