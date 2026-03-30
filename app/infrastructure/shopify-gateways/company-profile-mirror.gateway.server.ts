import {
  CompanyProfileMirrorPayload,
  CompanyProfileMirrorPayloadSchema,
  CompanyProfileMetaobjectState,
} from "../../contracts/sync.schema";
import { AppError } from "../../modules/auth/errors";
import {
  FindCompanyMetaobjectByOrgNumberQueryDataSchema,
  MetaobjectUpsertMutationDataSchema,
  MirrorMetafieldAddressValueSchema,
  ReadCompanyMetaobjectQueryDataSchema,
  ShopifyGraphqlResponseSchema,
} from "./schemas/company-profile-mirror.schema";

type ShopifyCredentials = {
  shop: string;
  accessToken: string;
};

const COMPANY_METAOBJECT_TYPE = "company";
const RETRY_DELAYS_MS = [100, 400, 1000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  return (
    error instanceof AppError &&
    ["SHOPIFY_RATE_LIMITED", "SHOPIFY_TEMPORARY_FAILURE", "INFRA_TIMEOUT", "INFRA_UNAVAILABLE"].includes(
      error.code,
    )
  );
}

export class CompanyProfileMirrorGateway {
  private readonly apiVersion = "2025-10";

  async upsertCompanyProfileMetaobject(
    credentials: ShopifyCredentials,
    payload: CompanyProfileMirrorPayload,
    companyId: string,
  ): Promise<void> {
    const parsedPayload = CompanyProfileMirrorPayloadSchema.safeParse(payload);
    if (!parsedPayload.success) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Invalid company mirror payload.",
        400,
        false,
      );
    }

    await this.withRetries(async () => {
      await this.metaobjectUpsert(credentials, companyId, parsedPayload.data);
    });
  }

  async readCompanyProfileMetaobject(
    credentials: ShopifyCredentials,
    companyId: string,
    orgNumber?: string,
  ): Promise<CompanyProfileMetaobjectState> {
    const orgNumberMatchedHandle = orgNumber
      ? await this.findCompanyMetaobjectHandleByOrgNumber(credentials, orgNumber)
      : null;
    const handle = orgNumberMatchedHandle ?? this.getCompanyMetaobjectHandle(companyId);
    return this.readCompanyProfileMetaobjectByHandle(credentials, handle, companyId);
  }

  private async readCompanyProfileMetaobjectByHandle(
    credentials: ShopifyCredentials,
    handle: string,
    companyId: string,
  ): Promise<CompanyProfileMetaobjectState> {
    return this.withRetries(async () => {
      const query = `#graphql
        query ReadCompanyMetaobject($handle: MetaobjectHandleInput!) {
          metaobjectByHandle(handle: $handle) {
            id
            nameField: field(key: "name") { value }
            orgNumberField: field(key: "org_number") { value }
            addressField: field(key: "address") { value }
            membersField: field(key: "members") { value }
          }
        }`;

      const response = await this.executeGraphql(credentials, query, {
        handle: {
          type: COMPANY_METAOBJECT_TYPE,
          handle,
        },
      });

      const parsed = ReadCompanyMetaobjectQueryDataSchema.safeParse(response.data);
      if (!parsed.success) {
        throw new AppError(
          "SHOPIFY_TEMPORARY_FAILURE",
          "Unexpected Shopify metaobject query payload.",
          503,
          true,
          { stage: "metaobject_read_parse", companyId, shop: credentials.shop },
        );
      }

      const addressRaw = parsed.data.metaobjectByHandle?.addressField?.value ?? null;
      let parsedAddress: CompanyProfileMetaobjectState["address"] = null;
      if (addressRaw !== null) {
        const trimmedAddress = addressRaw.trim();
        if (trimmedAddress.length > 0) {
          try {
            const result = MirrorMetafieldAddressValueSchema.safeParse(
              JSON.parse(trimmedAddress),
            );
            if (result.success) {
              parsedAddress = result.data;
            }
          } catch {
            parsedAddress = null;
          }
        }
      }

      return {
        type: COMPANY_METAOBJECT_TYPE,
        handle,
        name: parsed.data.metaobjectByHandle?.nameField?.value ?? null,
        org_number: parsed.data.metaobjectByHandle?.orgNumberField?.value ?? null,
        address: parsedAddress,
        membersRaw: parsed.data.metaobjectByHandle?.membersField?.value ?? null,
      };
    });
  }

  private async metaobjectUpsert(
    credentials: ShopifyCredentials,
    companyId: string,
    payload: CompanyProfileMirrorPayload,
  ): Promise<void> {
    const preferredHandle = this.getCompanyMetaobjectHandle(companyId);
    const orgNumberMatchedHandle = await this.findCompanyMetaobjectHandleByOrgNumber(
      credentials,
      payload.org_number,
    );
    const handle = orgNumberMatchedHandle ?? preferredHandle;

    const existingMetaobject = await this.readCompanyProfileMetaobjectByHandle(
      credentials,
      handle,
      companyId,
    );

    const mutation = `#graphql
      mutation UpsertCompanyMetaobject($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
        metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
          metaobject { id }
          userErrors {
            field
            message
            code
          }
        }
      }`;

    const fields: Array<{ key: string; value: string }> = [
      {
        key: "name",
        value: payload.company_name,
      },
      {
        key: "org_number",
        value: payload.org_number,
      },
      {
        key: "address",
        value: JSON.stringify(payload.company_address),
      },
    ];

    // Preserve existing members references when not available in app DB context.
    if (existingMetaobject.membersRaw) {
      fields.push({
        key: "members",
        value: existingMetaobject.membersRaw,
      });
    }

    const response = await this.executeGraphql(credentials, mutation, {
      handle: {
        type: COMPANY_METAOBJECT_TYPE,
        handle,
      },
      metaobject: {
        fields,
      },
    });

    const parsed = MetaobjectUpsertMutationDataSchema.safeParse(response.data);
    if (!parsed.success) {
      throw new AppError(
        "SHOPIFY_TEMPORARY_FAILURE",
        "Unexpected Shopify metaobject upsert payload.",
        503,
        true,
        { stage: "metaobject_upsert_parse", companyId, shop: credentials.shop },
      );
    }

    if (parsed.data.metaobjectUpsert.userErrors.length > 0) {
      throw new AppError(
        "SHOPIFY_USER_ERROR",
        "Shopify rejected company metaobject upsert.",
        400,
        false,
        {
          stage: "metaobject_upsert_user_error",
          companyId,
          shop: credentials.shop,
          userErrors: parsed.data.metaobjectUpsert.userErrors,
        },
      );
    }
  }

  private getCompanyMetaobjectHandle(companyId: string): string {
    const normalized = companyId
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return `company-${normalized || "unknown"}`;
  }

  private async findCompanyMetaobjectHandleByOrgNumber(
    credentials: ShopifyCredentials,
    orgNumber: string,
  ): Promise<string | null> {
    return this.withRetries(async () => {
      const query = `#graphql
        query FindCompanyMetaobjectByOrgNumber($type: String!, $first: Int!) {
          metaobjects(type: $type, first: $first) {
            nodes {
              id
              handle
              orgNumberField: field(key: "org_number") { value }
            }
          }
        }`;

      const response = await this.executeGraphql(credentials, query, {
        type: COMPANY_METAOBJECT_TYPE,
        first: 100,
      });

      const parsed = FindCompanyMetaobjectByOrgNumberQueryDataSchema.safeParse(
        response.data,
      );
      if (!parsed.success) {
        throw new AppError(
          "SHOPIFY_TEMPORARY_FAILURE",
          "Unexpected Shopify metaobject org_number lookup payload.",
          503,
          true,
          { stage: "metaobject_org_number_lookup_parse", shop: credentials.shop },
        );
      }

      const normalizedOrgNumber = orgNumber.trim();
      const match = parsed.data.metaobjects.nodes.find(
        (node) => (node.orgNumberField?.value ?? "").trim() === normalizedOrgNumber,
      );

      return match?.handle ?? null;
    });
  }

  private async executeGraphql(
    credentials: ShopifyCredentials,
    query: string,
    variables: Record<string, unknown>,
  ): Promise<{ data?: unknown }> {
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(
        `https://${credentials.shop}/admin/api/${this.apiVersion}/graphql.json`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-shopify-access-token": credentials.accessToken,
          },
          body: JSON.stringify({ query, variables }),
          signal: controller.signal,
        },
      );

      if (response.status === 429) {
        throw new AppError(
          "SHOPIFY_RATE_LIMITED",
          "Shopify rate limit reached.",
          429,
          true,
          { stage: "shopify_http_429", shop: credentials.shop },
        );
      }

      if (response.status >= 500) {
        throw new AppError(
          "SHOPIFY_TEMPORARY_FAILURE",
          "Shopify temporary failure.",
          503,
          true,
          { stage: "shopify_http_5xx", shop: credentials.shop },
        );
      }

      if (!response.ok) {
        let responseBody: unknown = null;
        try {
          responseBody = await response.json();
        } catch {
          try {
            responseBody = await response.text();
          } catch {
            responseBody = null;
          }
        }

        if (response.status === 401) {
          throw new AppError(
            "INFRA_UNAVAILABLE",
            "Shopify offline session is invalid. Re-authenticate the app to restore mirror sync.",
            503,
            true,
            {
              stage: "shopify_http_401",
              httpStatus: response.status,
              shop: credentials.shop,
              responseBody,
            },
          );
        }

        throw new AppError(
          "SHOPIFY_USER_ERROR",
          "Shopify request failed.",
          400,
          false,
          {
            stage: "shopify_http_non_ok",
            httpStatus: response.status,
            shop: credentials.shop,
            responseBody,
          },
        );
      }

      const payload = ShopifyGraphqlResponseSchema.safeParse(await response.json());
      if (!payload.success) {
        throw new AppError(
          "SHOPIFY_TEMPORARY_FAILURE",
          "Invalid Shopify response payload.",
          503,
          true,
          { stage: "shopify_graphql_response_parse", shop: credentials.shop },
        );
      }

      if (payload.data.errors && payload.data.errors.length > 0) {
        const hasThrottling = payload.data.errors.some((error) =>
          /throttled/i.test(error.message),
        );

        throw new AppError(
          hasThrottling ? "SHOPIFY_RATE_LIMITED" : "SHOPIFY_TEMPORARY_FAILURE",
          payload.data.errors[0]?.message ?? "Shopify GraphQL error.",
          hasThrottling ? 429 : 503,
          true,
          {
            stage: "shopify_graphql_errors",
            shop: credentials.shop,
            graphqlErrors: payload.data.errors,
          },
        );
      }

      return {
        data: payload.data.data,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new AppError("INFRA_TIMEOUT", "Shopify gateway timeout.", 503, true, {
          stage: "shopify_graphql_timeout",
          shop: credentials.shop,
        });
      }

      throw new AppError(
        "INFRA_UNAVAILABLE",
        "Unable to reach Shopify gateway.",
        503,
        true,
        { stage: "shopify_graphql_unreachable", shop: credentials.shop },
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private async withRetries<T>(task: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        return await task();
      } catch (error) {
        if (!isRetryableError(error) || attempt >= RETRY_DELAYS_MS.length) {
          throw error;
        }

        await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }

    throw new AppError("INTERNAL_ERROR", "Retry loop exited unexpectedly.", 500, false);
  }
}
