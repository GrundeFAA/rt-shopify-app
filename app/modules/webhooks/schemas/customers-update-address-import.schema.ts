import { z } from "zod";

export const ShopifyCustomerAddressSchema = z.object({
  address1: z.string().trim().min(1).optional().nullable(),
  address2: z.string().trim().optional().nullable(),
  zip: z.string().trim().min(1).optional().nullable(),
  city: z.string().trim().min(1).optional().nullable(),
  country_code: z.string().trim().min(2).max(2).optional().nullable(),
  countryCode: z.string().trim().min(2).max(2).optional().nullable(),
});

export const CustomersUpdateWebhookPayloadSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((value) => String(value)),
  default_address: ShopifyCustomerAddressSchema.optional().nullable(),
  addresses: z.array(ShopifyCustomerAddressSchema).optional().nullable(),
});

export type CustomersUpdateWebhookPayload = z.infer<typeof CustomersUpdateWebhookPayloadSchema>;

export type NormalizedExternalAddress = {
  line1: string;
  line2: string | null;
  postalCode: string;
  city: string;
  country: string;
};

export function normalizeExternalAddress(
  address: z.infer<typeof ShopifyCustomerAddressSchema>,
): NormalizedExternalAddress | null {
  const line1 = address.address1?.trim() ?? "";
  const postalCode = address.zip?.trim() ?? "";
  const city = address.city?.trim() ?? "";
  const countryRaw = address.country_code ?? address.countryCode;
  const country = countryRaw?.trim().toUpperCase() ?? "";

  if (!line1 || !postalCode || !city || country.length !== 2) {
    return null;
  }

  const line2 = address.address2?.trim() ?? "";

  return {
    line1,
    line2: line2 || null,
    postalCode,
    city,
    country,
  };
}

export function dedupeNormalizedAddresses(
  addresses: readonly NormalizedExternalAddress[],
): NormalizedExternalAddress[] {
  const seen = new Set<string>();
  const deduped: NormalizedExternalAddress[] = [];

  for (const address of addresses) {
    const key = [
      address.line1.toLowerCase(),
      address.line2?.toLowerCase() ?? "",
      address.postalCode.toLowerCase(),
      address.city.toLowerCase(),
      address.country.toLowerCase(),
    ].join("|");

    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(address);
  }

  return deduped;
}
