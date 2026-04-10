import { AppError } from "../../modules/auth/errors";
import { apiVersion } from "../../shopify.server";

const LIST_CUSTOMER_ADDRESSES_QUERY = `#graphql
  query ListCustomerAddresses($id: ID!) {
    customer(id: $id) {
      id
      addresses {
        id
      }
    }
  }
`;

const DELETE_CUSTOMER_ADDRESS_MUTATION = `#graphql
  mutation DeleteCustomerAddress($customerId: ID!, $addressId: ID!) {
    customerAddressDelete(customerId: $customerId, addressId: $addressId) {
      userErrors {
        field
        message
      }
    }
  }
`;

const CREATE_CUSTOMER_ADDRESS_MUTATION = `#graphql
  mutation CreateCustomerAddress(
    $customerId: ID!
    $address: MailingAddressInput!
    $setAsDefault: Boolean
  ) {
    customerAddressCreate(
      customerId: $customerId
      address: $address
      setAsDefault: $setAsDefault
    ) {
      userErrors {
        field
        message
      }
    }
  }
`;

type GraphqlError = { message?: string };
type GraphqlUserError = { field?: string[] | null; message?: string };

type ListCustomerAddressesResponse = {
  data?: {
    customer?: {
      id: string;
      addresses?: Array<{
        id?: string | null;
      }> | null;
    } | null;
  };
  errors?: GraphqlError[];
};

type DeleteCustomerAddressResponse = {
  data?: {
    customerAddressDelete?: {
      deletedCustomerAddressId?: string | null;
      userErrors?: GraphqlUserError[];
    } | null;
  };
  errors?: GraphqlError[];
};

type CreateCustomerAddressResponse = {
  data?: {
    customerAddressCreate?: {
      userErrors?: GraphqlUserError[];
    } | null;
  };
  errors?: GraphqlError[];
};

type CompanySharedAddressProjectionInput = {
  line1: string;
  line2: string | null;
  postalCode: string;
  city: string;
  country: string;
  company?: string;
};

function toShopifyGraphQlUrl(shop: string): string {
  const normalizedShop = shop.trim().toLowerCase();
  if (!normalizedShop) {
    throw new AppError("VALIDATION_FAILED", "Shop is required.", 400, false);
  }
  return `https://${normalizedShop}/admin/api/${apiVersion}/graphql.json`;
}

function toCustomerGid(customerId: string): string {
  const normalized = customerId.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new AppError("VALIDATION_FAILED", "Invalid customer id for Shopify sync.", 400, false);
  }
  return `gid://shopify/Customer/${normalized}`;
}

function normalizeDependencyError(status: number, details?: Record<string, unknown>): AppError {
  if (status === 429) {
    return new AppError(
      "SHOPIFY_RATE_LIMITED",
      "Shopify rate limit reached while syncing company addresses.",
      429,
      true,
      details,
    );
  }
  if (status >= 500) {
    return new AppError(
      "SHOPIFY_TEMPORARY_FAILURE",
      "Shopify temporarily unavailable while syncing company addresses.",
      503,
      true,
      details,
    );
  }
  return new AppError(
    "SHOPIFY_USER_ERROR",
    "Shopify returned an invalid response while syncing company addresses.",
    503,
    false,
    details,
  );
}

function isAddressDoesNotExistUserError(userError: GraphqlUserError): boolean {
  const field = userError.field?.join(".").toLowerCase() ?? "";
  const message = userError.message?.toLowerCase() ?? "";
  return field.includes("addressid") && message.includes("address does not exist");
}

function isAddressAlreadyExistsUserError(userError: GraphqlUserError): boolean {
  const field = userError.field?.join(".").toLowerCase() ?? "";
  const message = userError.message?.toLowerCase() ?? "";
  return field.includes("address") && message.includes("address already exists");
}

export class CompanyAddressesShopifyGateway {
  private async postGraphql<TResponse>(input: {
    shop: string;
    accessToken: string;
    query: string;
    variables: Record<string, unknown>;
  }): Promise<TResponse> {
    let response: Response;
    try {
      response = await fetch(toShopifyGraphQlUrl(input.shop), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": input.accessToken,
        },
        body: JSON.stringify({
          query: input.query,
          variables: input.variables,
        }),
      });
    } catch (error) {
      throw new AppError(
        "INFRA_UNAVAILABLE",
        "Could not reach Shopify while syncing company addresses.",
        503,
        true,
        { reason: error instanceof Error ? error.message : "Unknown network error" },
      );
    }

    const parsed = (await response.json()) as { errors?: GraphqlError[] };
    if (!response.ok) {
      throw normalizeDependencyError(response.status, { errors: parsed.errors });
    }

    return parsed as TResponse;
  }

  async replaceCustomerAddresses(input: {
    shop: string;
    accessToken: string;
    customerId: string;
    canonicalAddresses: CompanySharedAddressProjectionInput[];
  }): Promise<void> {
    const customerGid = toCustomerGid(input.customerId);
    const listed = await this.postGraphql<ListCustomerAddressesResponse>({
      shop: input.shop,
      accessToken: input.accessToken,
      query: LIST_CUSTOMER_ADDRESSES_QUERY,
      variables: {
        id: customerGid,
      },
    });

    if (listed.errors?.length) {
      throw new AppError(
        "SHOPIFY_USER_ERROR",
        "Shopify returned GraphQL errors while listing customer addresses.",
        503,
        false,
        { errors: listed.errors, customerId: input.customerId },
      );
    }

    const existingAddressIds =
      listed.data?.customer?.addresses
        ?.map((address) => address.id ?? null)
        .filter((id): id is string => Boolean(id)) ?? [];

    for (const addressId of existingAddressIds) {
      const deleted = await this.postGraphql<DeleteCustomerAddressResponse>({
        shop: input.shop,
        accessToken: input.accessToken,
        query: DELETE_CUSTOMER_ADDRESS_MUTATION,
        variables: {
          customerId: customerGid,
          addressId,
        },
      });

      const deleteUserErrors = deleted.data?.customerAddressDelete?.userErrors ?? [];
      const blockingDeleteUserErrors = deleteUserErrors.filter(
        (userError) => !isAddressDoesNotExistUserError(userError),
      );
      if (deleted.errors?.length || blockingDeleteUserErrors.length) {
        throw new AppError(
          "SHOPIFY_USER_ERROR",
          "Failed deleting customer address during shared-address sync.",
          503,
          false,
          {
            errors: deleted.errors,
            userErrors: deleteUserErrors,
            customerId: input.customerId,
            addressId,
          },
        );
      }
    }

    for (let index = 0; index < input.canonicalAddresses.length; index += 1) {
      const canonicalAddress = input.canonicalAddresses[index];
      const isFirstAddress = index === 0;
      const created = await this.postGraphql<CreateCustomerAddressResponse>({
        shop: input.shop,
        accessToken: input.accessToken,
        query: CREATE_CUSTOMER_ADDRESS_MUTATION,
        variables: {
          customerId: customerGid,
          setAsDefault: isFirstAddress,
          address: {
            address1: canonicalAddress.line1,
            address2: canonicalAddress.line2 ?? undefined,
            zip: canonicalAddress.postalCode,
            city: canonicalAddress.city,
            countryCode: canonicalAddress.country,
            company: canonicalAddress.company?.trim() || undefined,
          },
        },
      });

      const createUserErrors = created.data?.customerAddressCreate?.userErrors ?? [];
      const blockingCreateUserErrors = createUserErrors.filter(
        (userError) => !isAddressAlreadyExistsUserError(userError),
      );
      if (created.errors?.length || blockingCreateUserErrors.length) {
        throw new AppError(
          "SHOPIFY_USER_ERROR",
          "Failed creating customer address during shared-address sync.",
          503,
          false,
          {
            errors: created.errors,
            userErrors: createUserErrors,
            customerId: input.customerId,
          },
        );
      }
    }
  }
}

