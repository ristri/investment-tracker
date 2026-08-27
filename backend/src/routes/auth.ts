import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import * as bcrypt from 'bcryptjs';
import { Env, User, JWTPayload } from '@investment-tracker/shared';
import { authMiddleware } from '../middleware/auth';

const auth = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

const TOKEN_EXPIRY_DAYS = 30;

auth.post('/login', async (c) => {
  const { username, password } = await c.req.json();
  if (!username || !password) {
    return c.json({ error: 'Missing credentials' }, 400);
  }

  const db = c.env.investment_tracker_db;
  const user = await db
    .prepare('SELECT * FROM users WHERE username = ?')
    .bind(username)
    .first<any>();

  if (!user) {
    return c.json({ error: 'Invalid username or password' }, 401);
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return c.json({ error: 'Invalid username or password' }, 401);
  }

  // Generate JWT (30 days)
  const exp = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_DAYS * 24 * 60 * 60;
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    exp,
  };

  const secret = c.env.JWT_SECRET || 'dev-secret-key-12345678901234567890';
  const token = await sign(payload, secret);

  return c.json({
    token,
    user: {
      id: user.id,
      username: user.username,
    },
  }, 200);
});

auth.use('/me', authMiddleware);
auth.get('/me', async (c) => {
  const payload = c.get('jwtPayload');
  if (!payload || !payload.userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const db = c.env.investment_tracker_db;
  const user = await db
    .prepare('SELECT id, username, created_at FROM users WHERE id = ?')
    .bind(payload.userId)
    .first<User>();

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ user });
});

export default auth;
