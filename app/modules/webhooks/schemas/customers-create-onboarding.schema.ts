import { z } from "zod";
import { CompanyAddressSchema } from "../../../contracts/company.schema";

export const CustomersCreateWebhookPayloadSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((value) => String(value)),
  note: z.string().nullable().optional(),
});

export const CustomersCreateOnboardingNoteSchema = z.object({
  company_name: z.string().trim().min(1),
  company_org_number: z.string().trim().min(1),
  company_address_line1: z.string().trim().min(1),
  company_address_line2: z.string().trim().optional(),
  company_postal_code: z.string().trim().min(1),
  company_city: z.string().trim().min(1),
});

const expectedKeys = new Set([
  "company_name",
  "company_org_number",
  "company_address_line1",
  "company_address_line2",
  "company_postal_code",
  "company_city",
]);

export function parseOnboardingNoteContract(
  note: string,
): z.infer<typeof CustomersCreateOnboardingNoteSchema> | null {
  const raw = note.trim();
  if (!raw) {
    return null;
  }

  const parsedRecord: Record<string, string> = {};
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!expectedKeys.has(key)) {
      continue;
    }

    parsedRecord[key] = value;
  }

  const parsed = CustomersCreateOnboardingNoteSchema.safeParse(parsedRecord);
  return parsed.success ? parsed.data : null;
}

export function toCompanyAddressFromOnboardingNote(input: {
  company_address_line1: string;
  company_address_line2?: string;
  company_postal_code: string;
  company_city: string;
}): z.infer<typeof CompanyAddressSchema> {
  const defaultCountry = (process.env.ONBOARDING_DEFAULT_COUNTRY ?? "NO").trim().toUpperCase();

  return CompanyAddressSchema.parse({
    line1: input.company_address_line1,
    line2: input.company_address_line2,
    postalCode: input.company_postal_code,
    city: input.company_city,
    country: defaultCountry,
  });
}
