import { Hono } from 'hono';
import type { Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import { getSession } from '../sessions.js';

const app = new Hono();

app.get('/api/sessions/:id/events', (c: Context) => {
  const id = c.req.param('id');
  const sess = getSession(id);
  if (!sess) return c.text('Session not found', 404);

  return streamSSE(c, async (stream) => {
    const sendEvent = async (event: any) => {
      try {
        await stream.writeSSE({
          data: JSON.stringify(event),
        });
      } catch {
        sess.subscribers.delete(sendEvent);
      }
    };

    sess.subscribers.add(sendEvent);

    stream.onAbort(() => {
      sess.subscribers.delete(sendEvent);
    });

    // Keep stream open with sleep loop
    while (!stream.aborted) {
      await stream.sleep(15000);
      try {
        await stream.writeSSE({
          event: 'ping',
          data: 'heartbeat',
        });
      } catch {
        break;
      }
    }
  });
});

export default app;

