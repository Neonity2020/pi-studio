import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ModelInfo } from './types.js';

const execFileAsync = promisify(execFile);
let availableModels: ModelInfo[] = [];

export async function getAvailableModels(): Promise<ModelInfo[]> {
  if (availableModels.length === 0) {
    await refreshAvailableModels();
  }
  return availableModels;
}

export async function refreshAvailableModels(): Promise<ModelInfo[]> {
  try {
    const { stdout } = await execFileAsync('pi', ['--list-models'], {
      env: { ...process.env, PATH: process.env.PATH },
    });

    const lines = stdout.trim().split('\n');
    const parsed: ModelInfo[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        parsed.push({
          provider: parts[0],
          id: parts[1],
          name: `${parts[0]} / ${parts[1]}`,
          context: parts[2] ?? '',
          maxOut: parts[3] ?? '',
          thinking: parts[4] === 'yes',
        });
      }
    }

    if (parsed.length > 0) {
      availableModels = parsed;
    }
  } catch (err) {
    console.error('Failed to list pi models:', err);
  }

  return availableModels;
}
