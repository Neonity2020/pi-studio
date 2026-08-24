import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import sessionsRoutes from './routes/sessions.js';
import eventsRoutes from './routes/events.js';
import { createSession, getDefaultSession, closeAllSessions } from './sessions.js';
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

const server = serve({
  fetch: app.fetch,
  port: PORT,
}, () => {
  console.log(`Pi Agent Hono Backend running on http://localhost:${PORT}`);
});

function handleExit() {
  console.log('\nShutting down Pi Studio backend...');
  closeAllSessions();
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => {
    process.exit(0);
  }, 1000).unref();
}

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
process.on('exit', handleExit);
