import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export interface PersistentSessionSummary {
  id: string;
  path: string;
  title: string;
  createdAt: number;
  messageCount: number;
  modelId?: string;
  cwd?: string;
}

function getSessionDirForCwd(cwd: string): string {
  const normalized = cwd.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9]/g, '-');
  const dirName = `--${normalized}--`;
  const baseDir = process.env.PI_CODING_AGENT_DIR || path.join(os.homedir(), '.pi', 'agent');
  return path.join(baseDir, 'sessions', dirName);
}

export async function listPersistentSessions(cwd: string = process.cwd()): Promise<PersistentSessionSummary[]> {
  const dir = getSessionDirForCwd(cwd);
  const results: PersistentSessionSummary[] = [];

  try {
    const files = await fs.readdir(dir);
    const jsonlFiles = files.filter((f) => f.endsWith('.jsonl')).sort().reverse();

    for (const file of jsonlFiles) {
      const fullPath = path.join(dir, file);
      try {
        const content = await fs.readFile(fullPath, 'utf8');
        const lines = content.trim().split('\n');
        let sessionHeader: any = null;
        let title = '';
        let messageCount = 0;
        let modelId = '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const entry = JSON.parse(line);
            if (entry.type === 'session') {
              sessionHeader = entry;
            } else if (entry.type === 'model_change') {
              modelId = entry.modelId;
            } else if (entry.type === 'message') {
              messageCount++;
              if (!title && entry.message?.role === 'user') {
                const textContent = Array.isArray(entry.message.content)
                  ? entry.message.content.find((c: any) => c.type === 'text')?.text
                  : String(entry.message.content || '');
                if (textContent) {
                  title = textContent.slice(0, 32);
                }
              }
            }
          } catch {
            // skip malformed line
          }
        }

        const createdAt = sessionHeader?.timestamp ? new Date(sessionHeader.timestamp).getTime() : Date.now();
        const id = sessionHeader?.id || file.replace('.jsonl', '');

        results.push({
          id,
          path: fullPath,
          title: title || '历史会话',
          createdAt,
          messageCount,
          modelId: modelId || 'default',
          cwd: sessionHeader?.cwd || cwd,
        });
      } catch {
        // Skip unreadable file
      }
    }
  } catch {
    // Directory might not exist yet
  }

  return results;
}
