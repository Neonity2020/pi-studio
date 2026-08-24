import path from 'node:path';
import fs from 'node:fs/promises';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { createSession, getSession, listAllSessions, switchSessionTo } from '../sessions.js';
import { getAvailableModels } from '../models.js';
import type { SessionResponse, GetSessionResponse } from '../types.js';

const app = new Hono();

// POST /api/workspaces/validate
app.post('/api/workspaces/validate', async (c: Context) => {
  const body = await c.req.json<{ path?: string }>();
  const raw = (body.path ?? '').trim();
  if (!raw) {
    return c.json({ valid: false as const, error: '路径不能为空' });
  }

  try {
    const resolvedPath = path.resolve(raw);
    const stat = await fs.stat(resolvedPath);
    if (!stat.isDirectory()) {
      return c.json({ valid: false as const, error: '该路径不是目录' });
    }
    await fs.access(resolvedPath, fs.constants.R_OK | fs.constants.X_OK);
    return c.json({ valid: true as const, resolvedPath });
  } catch {
    return c.json({ valid: false as const, error: '目录不存在或无访问权限' });
  }
});

// GET /api/models
app.get('/api/models', (c: Context) => {
  return c.json({ models: getAvailableModels() });
});

// GET /api/sessions
app.get('/api/sessions', async (c: Context) => {
  const sessions = await listAllSessions();
  return c.json({ sessions });
});

// POST /api/sessions/switch
app.post('/api/sessions/switch', async (c: Context) => {
  const body = await c.req.json<{ sessionPath?: string }>();
  if (!body.sessionPath) {
    return c.json({ error: 'sessionPath required' }, 400);
  }
  const sess = await switchSessionTo(body.sessionPath);
  return c.json({
    id: sess.id,
    title: sess.title,
    createdAt: sess.createdAt,
    modelId: sess.model?.id ?? 'default',
    workspaceDir: sess.workspaceDir,
  });
});

// POST /api/sessions
app.post('/api/sessions', async (c: Context) => {
  const body = await c.req.json<{
    title?: string;
    modelId?: string;
    provider?: string;
    workspaceDir?: string;
  }>();
  const sess = createSession({
    title: body.title,
    modelId: body.modelId,
    provider: body.provider,
    workspaceDir: body.workspaceDir,
  });
  return c.json<SessionResponse>({
    id: sess.id,
    title: sess.title,
    createdAt: sess.createdAt,
    modelId: sess.model?.id ?? 'default',
    workspaceDir: sess.workspaceDir,
  });
});

// GET /api/sessions/:id
app.get('/api/sessions/:id', async (c: Context) => {
  const id = c.req.param('id');
  let sess = getSession(id);

  // If not in memory, check if it's a persisted session on disk
  if (!sess) {
    const all = await listAllSessions();
    const target = all.find((s) => s.id === id);
    if (target?.sessionPath) {
      sess = await switchSessionTo(target.sessionPath);
    }
  }

  if (!sess) return c.json({ error: 'Session not found' }, 404);

  const resp: GetSessionResponse = {
    id: sess.id,
    title: sess.title,
    createdAt: sess.createdAt,
    model: sess.model || { id: 'pi-default', name: 'Pi Local Agent' },
    workspaceDir: sess.workspaceDir,
    state: {
      messages: sess.messages,
      isStreaming: sess.isStreaming,
      tools: [
        { name: 'read', description: 'Read file contents' },
        { name: 'bash', description: 'Execute bash commands' },
        { name: 'edit', description: 'Edit files with find/replace' },
        { name: 'write', description: 'Write files' },
      ],
      hasQueuedMessages: false,
    },
  };
  return c.json(resp);
});

// POST /api/sessions/:id/prompt
app.post('/api/sessions/:id/prompt', async (c: Context) => {
  const id = c.req.param('id');
  const sess = getSession(id);
  if (!sess) return c.json({ error: 'Session not found' }, 404);

  const body = await c.req.json<{ prompt?: string }>();
  const { prompt } = body;
  if (!prompt || typeof prompt !== 'string') {
    return c.json({ error: 'Prompt text required' }, 400);
  }

  if (sess.messages.length === 0) {
    sess.title = prompt.slice(0, 30);
  }

  sess.proc.stdin.write(
    JSON.stringify({
      id: `prompt_${Date.now()}`,
      type: 'prompt',
      message: prompt,
    }) + '\n',
  );

  return c.json({ status: 'sent' });
});

// POST /api/sessions/:id/steer
app.post('/api/sessions/:id/steer', async (c: Context) => {
  const id = c.req.param('id');
  const sess = getSession(id);
  if (!sess) return c.json({ error: 'Session not found' }, 404);

  const body = await c.req.json<{ prompt?: string }>();
  const { prompt } = body;
  sess.proc.stdin.write(
    JSON.stringify({
      id: `steer_${Date.now()}`,
      type: 'steer',
      message: prompt ?? '',
    }) + '\n',
  );

  return c.json({ status: 'steered' });
});

// POST /api/sessions/:id/follow-up
app.post('/api/sessions/:id/follow-up', async (c: Context) => {
  const id = c.req.param('id');
  const sess = getSession(id);
  if (!sess) return c.json({ error: 'Session not found' }, 404);

  const body = await c.req.json<{ prompt?: string }>();
  const { prompt } = body;
  sess.proc.stdin.write(
    JSON.stringify({
      id: `followup_${Date.now()}`,
      type: 'follow_up',
      message: prompt ?? '',
    }) + '\n',
  );

  return c.json({ status: 'queued_follow_up' });
});

// POST /api/sessions/:id/abort
app.post('/api/sessions/:id/abort', (c: Context) => {
  const id = c.req.param('id');
  const sess = getSession(id);
  if (!sess) return c.json({ error: 'Session not found' }, 404);

  sess.isStreaming = false;
  sess.proc.stdin.write(
    JSON.stringify({
      id: `abort_${Date.now()}`,
      type: 'abort',
    }) + '\n',
  );

  return c.json({ status: 'aborted' });
});

// POST /api/sessions/:id/reset
app.post('/api/sessions/:id/reset', (c: Context) => {
  const id = c.req.param('id');
  const sess = getSession(id);
  if (!sess) return c.json({ error: 'Session not found' }, 404);

  sess.proc.stdin.write(
    JSON.stringify({
      id: `new_session_${Date.now()}`,
      type: 'new_session',
    }) + '\n',
  );
  sess.messages = [];

  return c.json({ status: 'reset' });
});

// POST /api/sessions/:id/config
app.post('/api/sessions/:id/config', async (c: Context) => {
  const id = c.req.param('id');
  const sess = getSession(id);
  if (!sess) return c.json({ error: 'Session not found' }, 404);

  const body = await c.req.json<{ modelId?: string; provider?: string }>();
  const { modelId, provider } = body;
  if (modelId) {
    const p = provider ?? getAvailableModels().find((m) => m.id === modelId)?.provider ?? 'opencode-go';
    sess.proc.stdin.write(
      JSON.stringify({
        id: `set_model_${Date.now()}`,
        type: 'set_model',
        provider: p,
        modelId,
      }) + '\n',
    );
  }

  return c.json({ status: 'model_updated' });
});

export default app;
