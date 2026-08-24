import { spawn } from 'child_process';
import type { ModelInfo } from './types.js';

let availableModels: ModelInfo[] = [];

export function getAvailableModels(): ModelInfo[] {
  return availableModels;
}

export function refreshAvailableModels(): void {
  const p = spawn('pi', ['--list-models'], { shell: false });
  let output = '';
  p.stdout.on('data', (d) => (output += d.toString()));
  p.on('close', () => {
    const lines = output.trim().split('\n');
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
  });
}
