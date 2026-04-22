function getAppBaseUrl() {
  const value = shopify.settings?.value?.app_base_url || "";
  return value.replace(/\/$/, "");
}

export async function postToAppBackend(path, payload, options = {}) {
  const appBaseUrl = getAppBaseUrl();
  if (!appBaseUrl) {
    throw new Error("Missing app backend URL setting.");
  }

  const sessionToken = await shopify.sessionToken.get();
  const response = await fetch(`${appBaseUrl}${path}`, {
    method: options.method || "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorMessage =
      data?.message ||
      data?.error ||
      data?.errors?.[0]?.message ||
      "Request failed.";
    const error = new Error(errorMessage);
    error.code = data?.code;
    error.details = data?.details;
    throw error;
  }

  return data;
}
