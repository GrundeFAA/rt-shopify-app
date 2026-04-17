export const METAFIELD_NAMESPACE = "custom";

export function idsMatch(leftId, rightId) {
  if (!leftId || !rightId) {
    return false;
  }

  return leftId === rightId || leftId.endsWith(`/${rightId}`) || rightId.endsWith(`/${leftId}`);
}

export function getAdministratorIds(company) {
  const administratorIdsFromReferences =
    company?.administrators?.references?.nodes?.map((node) => node?.id).filter(Boolean) ?? [];
  const administratorIdsFromJson = Array.isArray(company?.administrators?.jsonValue)
    ? company.administrators.jsonValue.filter(Boolean)
    : [];

  return [...new Set([...administratorIdsFromJson, ...administratorIdsFromReferences])];
}

export function buildCompanyUsers(locations, administratorIds, translate) {
  const usersById = new Map();

  for (const location of locations) {
    const locationName = location?.name || translate("companySettingsLocationFallback");
    const contacts = location?.contacts?.nodes ?? [];

    for (const contact of contacts) {
      const customer = contact?.customer;
      const customerId = customer?.id ?? contact?.id;
      if (!customerId) {
        continue;
      }

      const existingUser = usersById.get(customerId);
      const fullName = [customer?.firstName, customer?.lastName].filter(Boolean).join(" ").trim();

      if (existingUser) {
        if (!existingUser.locationNames.includes(locationName)) {
          existingUser.locationNames.push(locationName);
        }
        continue;
      }

      usersById.set(customerId, {
        id: customerId,
        isAdmin: administratorIds.some((administratorId) => idsMatch(administratorId, customerId)),
        name: fullName || customer?.emailAddress?.emailAddress || translate("memberNameFallback"),
        email: customer?.emailAddress?.emailAddress || "-",
        locationNames: [locationName],
      });
    }
  }

  return [...usersById.values()];
}

export function formatLocationAddress(location, translate) {
  const parts = [
    location?.shippingAddress?.address1,
    location?.shippingAddress?.city,
    location?.shippingAddress?.zip,
    location?.shippingAddress?.country,
  ].filter(Boolean);

  return parts.join(", ") || translate("companySettingsLocationNoAddress");
}

export function validateOptionalEmail(value, invalidMessage) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return "";
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue) ? "" : invalidMessage;
}
