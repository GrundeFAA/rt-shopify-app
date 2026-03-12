import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    SHOPIFY_APP_URL: z.string().url().default("http://localhost:3000"),
    SHOPIFY_CLIENT_SECRET: z.string().min(1),
    SHOPIFY_STORE_DOMAIN: z
      .string()
      .transform((value) =>
        value
          .trim()
          .toLowerCase()
          .replace(/^https?:\/\//, "")
          .replace(/\/+$/, ""),
      )
      .pipe(z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/)),
    SHOPIFY_ADMIN_ACCESS_TOKEN: z.string().min(1),
    SHOPIFY_WEBHOOK_SECRET: z.string().min(1).optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  client: {
  },

  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
    SHOPIFY_CLIENT_SECRET: process.env.SHOPIFY_CLIENT_SECRET,
    SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN,
    SHOPIFY_ADMIN_ACCESS_TOKEN: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
    SHOPIFY_WEBHOOK_SECRET: process.env.SHOPIFY_WEBHOOK_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
