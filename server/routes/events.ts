import { Hono } from 'hono';
import type { Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import { getSession } from '../sessions.js';

const app = new Hono();

app.get('/api/sessions/:id/events', async (c: Context) => {
  const id = c.req.param('id');
  const sess = getSession(id);
  if (!sess) return c.text('Session not found', 404);

  return streamSSE(c, async (stream) => {
    const sendEvent = (event: any) => {
      stream.writeSSE({
        data: JSON.stringify(event),
      });
    };

    sess.subscribers.add(sendEvent);

    stream.onAbort(() => {
      sess.subscribers.delete(sendEvent);
    });

    // Keep stream open
    while (true) {
      await stream.sleep(15000);
      await stream.writeSSE({ comment: 'ping' });
    }
  });
});

export default app;
