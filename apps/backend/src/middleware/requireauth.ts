import { createMiddleware } from "hono/factory";
import { auth } from "../lib/auth";
import type { Appvariables } from "../env";

export const requireauth = createMiddleware<{ Variables: Appvariables }>(
  async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json({ error: "unauthenticated" }, 401);
    }
    c.set("user", session.user);
    c.set("session", session.session);
    await next();
  },
);
