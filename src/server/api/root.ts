import { b2bRouter } from "#/server/api/routers/b2b";
import { createCallerFactory, createTRPCRouter } from "#/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  b2b: b2bRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.b2b.listPendingMemberships();
 *       ^? Pending membership rows
 */
export const createCaller = createCallerFactory(appRouter);
