const API_VERSION = "2025-01";

const requiredEnv = (name) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};

const normalizeShopDomain = (input) =>
  input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");

const normalizeBaseUrl = (input) => {
  const parsed = new URL(input.trim());
  return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
};

const shopDomain = normalizeShopDomain(requiredEnv("SHOPIFY_STORE_DOMAIN"));
const adminAccessToken = requiredEnv("SHOPIFY_ADMIN_ACCESS_TOKEN");
const webhookBaseUrl = normalizeBaseUrl(
  process.argv[2] ?? requiredEnv("SHOPIFY_WEBHOOK_BASE_URL"),
);

const desiredWebhooks = [
  {
    topic: "customers/create",
    address: `${webhookBaseUrl}/api/webhooks/shopify/customers/create`,
    format: "json",
  },
  {
    topic: "customers/update",
    address: `${webhookBaseUrl}/api/webhooks/shopify/customers/update`,
    format: "json",
  },
];

const requestShopify = async (path, init = {}) => {
  const response = await fetch(`https://${shopDomain}/admin/api/${API_VERSION}${path}`, {
    ...init,
    headers: {
      "X-Shopify-Access-Token": adminAccessToken,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Shopify API ${response.status} on ${path}: ${body}`);
  }

  return response.json();
};

const listWebhooks = async () => {
  const result = await requestShopify("/webhooks.json?limit=250");
  return result.webhooks ?? [];
};

const createWebhook = (webhook) =>
  requestShopify("/webhooks.json", {
    method: "POST",
    body: JSON.stringify({ webhook }),
  });

const updateWebhook = (id, webhook) =>
  requestShopify(`/webhooks/${id}.json`, {
    method: "PUT",
    body: JSON.stringify({ webhook }),
  });

const deleteWebhook = (id) =>
  requestShopify(`/webhooks/${id}.json`, {
    method: "DELETE",
  });

const reconcile = async () => {
  const existing = await listWebhooks();
  let created = 0;
  let updated = 0;
  let deleted = 0;
  let unchanged = 0;

  for (const desired of desiredWebhooks) {
    const sameTopic = existing.filter(
      (w) => w.topic === desired.topic && w.format === desired.format,
    );

    const exactMatch = sameTopic.find((w) => w.address === desired.address);
    if (exactMatch) {
      unchanged += 1;
      const duplicates = sameTopic.filter((w) => w.id !== exactMatch.id);
      for (const duplicate of duplicates) {
        await deleteWebhook(duplicate.id);
        deleted += 1;
      }
      continue;
    }

    if (sameTopic.length > 0) {
      const primary = sameTopic[0];
      await updateWebhook(primary.id, desired);
      updated += 1;

      for (const duplicate of sameTopic.slice(1)) {
        await deleteWebhook(duplicate.id);
        deleted += 1;
      }
      continue;
    }

    await createWebhook(desired);
    created += 1;
  }

  return { created, updated, deleted, unchanged };
};

try {
  const result = await reconcile();
  console.log("Webhook reconcile complete.");
  console.log(
    `Created: ${result.created}, Updated: ${result.updated}, Deleted duplicates: ${result.deleted}, Unchanged: ${result.unchanged}`,
  );
  console.log(`Shop: ${shopDomain}`);
  console.log(`Base URL: ${webhookBaseUrl}`);
} catch (error) {
  console.error("Failed to register webhooks.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
