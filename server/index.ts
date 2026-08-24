import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import sessionsRoutes from './routes/sessions.js';
import eventsRoutes from './routes/events.js';
import { createSession, getDefaultSession } from './sessions.js';
import { refreshAvailableModels } from './models.js';

const app = new Hono();
const PORT = Number(process.env.PORT) || 3001;

app.use('*', cors());

// Register route modules
app.route('/', sessionsRoutes);
app.route('/', eventsRoutes);

// Bootstrap: create default session and start model discovery
createSession({
  id: 'default-session',
  title: 'Local Pi Agent Workspace',
});
getDefaultSession(); // ensure reference kept

refreshAvailableModels();

serve({
  fetch: app.fetch,
  port: PORT,
}, () => {
  console.log(`Pi Agent Hono Backend running on http://localhost:${PORT}`);
});
