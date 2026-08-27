import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env, JWTPayload } from '@investment-tracker/shared';
import authRoutes from './routes/auth';
import holdingsRoutes from './routes/holdings';
import snapshotsRoutes from './routes/snapshots';
import marketRoutes from './routes/market';
import { authMiddleware } from './middleware/auth';
import { ensureD1Schema } from './db/migrate';

const app = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

// CORS configuration
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,
}));

// Automatic schema migration check
app.use('*', async (c, next) => {
  if (c.env?.investment_tracker_db) {
    await ensureD1Schema(c.env.investment_tracker_db);
  }
  await next();
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok', app: 'investment-tracker', time: new Date().toISOString() }));

// Public auth routes
app.route('/api/v1/auth', authRoutes);

// Protected routes with auth middleware
app.use('/api/v1/holdings/*', authMiddleware);
app.route('/api/v1/holdings', holdingsRoutes);

app.use('/api/v1/snapshots/*', authMiddleware);
app.route('/api/v1/snapshots', snapshotsRoutes);

app.use('/api/v1/market/*', authMiddleware);
app.route('/api/v1/market', marketRoutes);

// 404 handler
app.notFound((c) => c.json({ error: 'Endpoint not found' }, 404));

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({
    error: err.message || 'Internal Server Error',
  }, 500);
});

export default app;
