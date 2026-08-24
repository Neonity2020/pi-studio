import type { ModelInfo } from './types.ts';
import { getDefaultSession, createSession } from './sessions.ts';

let availableModels: ModelInfo[] = [];

export async function getAvailableModels(): Promise<ModelInfo[]> {
  if (availableModels.length === 0) {
    await refreshAvailableModels();
  }
  return availableModels;
}

export async function refreshAvailableModels(): Promise<ModelInfo[]> {
  const sess = getDefaultSession() || createSession({ id: 'default-session' });

  return new Promise((resolve) => {
    const id = `get_models_${Date.now()}`;

    const handler = (json: any) => {
      if (json.type === 'response' && json.id === id && json.data?.models) {
        sess.subscribers.delete(handler);
        const list: ModelInfo[] = json.data.models.map((m: any) => ({
          provider: m.provider,
          id: m.id,
          name: m.name || `${m.provider} / ${m.id}`,
          context: m.contextWindow ? `${Math.round(m.contextWindow / 1000)}K` : '',
          maxOut: m.maxTokens ? `${Math.round(m.maxTokens / 1000)}K` : '',
          thinking: !!m.reasoning,
        }));
        if (list.length > 0) {
          availableModels = list;
        }
        resolve(availableModels);
      }
    };

    sess.subscribers.add(handler);

    // Give child process 100ms to open stdin pipe if just spawned
    setTimeout(() => {
      sess.proc.stdin.write(
        JSON.stringify({
          id,
          type: 'get_available_models',
        }) + '\n',
      );
    }, 150);

    // Timeout fallback after 3s
    setTimeout(() => {
      sess.subscribers.delete(handler);
      resolve(availableModels);
    }, 3000);
  });
}
