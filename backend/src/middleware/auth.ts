import { jwt } from 'hono/jwt';
import { Env, JWTPayload } from '@investment-tracker/shared';
import { MiddlewareHandler } from 'hono';

export const authMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }> = async (c, next) => {
  if (c.req.path.endsWith('/auth/login') || c.req.path.endsWith('/auth/register')) {
    return next();
  }
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET || 'dev-secret-key-12345678901234567890',
    alg: 'HS256',
  });
  return jwtMiddleware(c, next);
};
