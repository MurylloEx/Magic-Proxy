import type { Express, RequestHandler } from 'express';

/**
 * Apply a middleware chain to an Express application in declaration order.
 */
export function applyMiddlewareChain(
  app: Express,
  middlewares: readonly RequestHandler[],
): void {
  middlewares.forEach((middleware) => {
    app.use(middleware);
  });
}
