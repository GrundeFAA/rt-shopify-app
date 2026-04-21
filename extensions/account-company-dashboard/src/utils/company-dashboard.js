export const METAFIELD_NAMESPACE = "custom";
export const SHOPIFY_COMPANY_LOCATION_ROLE_NAME_MAP = {
  admin: "Location admin",
  buyer: "Ordering only",
};
const ROLE_KEY_BY_NAME = new Map(
  Object.entries(SHOPIFY_COMPANY_LOCATION_ROLE_NAME_MAP).map(([roleKey, roleName]) => [
    roleName,
    roleKey,
  ]),
);

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
    const roleAssignments = location?.roleAssignments?.nodes ?? [];
    const roleAssignmentsByContactId = new Map();

    for (const assignment of roleAssignments) {
      const contactId = assignment?.contact?.id;
      const roleName = assignment?.role?.name;
      if (!contactId || !roleName) {
        continue;
      }

      roleAssignmentsByContactId.set(contactId, {
        companyLocationId: location?.id,
        companyLocationName: locationName,
        roleName,
        role: ROLE_KEY_BY_NAME.get(roleName) || "buyer",
      });
    }

    for (const contact of contacts) {
      const customer = contact?.customer;
      const customerId = customer?.id ?? contact?.id;
      if (!customerId) {
        continue;
      }
      const assignment = roleAssignmentsByContactId.get(contact.id);

      const existingUser = usersById.get(customerId);
      const fullName = [customer?.firstName, customer?.lastName].filter(Boolean).join(" ").trim();

      if (existingUser) {
        if (!existingUser.locationNames.includes(locationName)) {
          existingUser.locationNames.push(locationName);
        }
        if (assignment) {
          existingUser.assignments.push(assignment);
          if (!existingUser.roles.includes(assignment.roleName)) {
            existingUser.roles.push(assignment.roleName);
          }
        }
        continue;
      }

      usersById.set(customerId, {
        id: customerId,
        companyContactId: contact.id,
        isAdmin: administratorIds.some((administratorId) => idsMatch(administratorId, customerId)),
        name: fullName || customer?.emailAddress?.emailAddress || translate("memberNameFallback"),
        email: customer?.emailAddress?.emailAddress || "-",
        locationNames: [locationName],
        roles: assignment ? [assignment.roleName] : [],
        assignments: assignment ? [assignment] : [],
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

export function getMainLocation(locations, mainLocationId) {
  return (
    locations.find((location) => idsMatch(location?.id, mainLocationId)) ??
    locations[0] ??
    null
  );
}

export function validateOptionalEmail(value, invalidMessage) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return "";
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue) ? "" : invalidMessage;
}
