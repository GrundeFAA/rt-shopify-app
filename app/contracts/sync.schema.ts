import { z } from "zod";
import { CompanyAddressSchema } from "./company.schema";

export const CompanyProfileMirrorPayloadSchema = z.object({
  company_name: z.string().min(1),
  org_number: z.string().min(1),
  company_address: CompanyAddressSchema,
});
export type CompanyProfileMirrorPayload = z.infer<typeof CompanyProfileMirrorPayloadSchema>;

export const CompanyProfileDriftReportSchema = z.object({
  companyId: z.string(),
  inSync: z.boolean(),
  mismatches: z.array(
    z.object({
      key: z.string().min(1),
      sourceValue: z.unknown(),
      mirroredValue: z.unknown(),
    }),
  ),
  metaobject: z
    .object({
      type: z.literal("company"),
      handle: z.string().min(1),
      inSync: z.boolean(),
      mismatches: z.array(
        z.object({
          key: z.enum(["name", "org_number", "address"]),
          sourceValue: z.unknown(),
          mirroredValue: z.unknown(),
        }),
      ),
      membersPreserved: z.boolean(),
    })
    .optional(),
});
export type CompanyProfileDriftReport = z.infer<typeof CompanyProfileDriftReportSchema>;

export const CompanyProfileMetaobjectStateSchema = z.object({
  type: z.literal("company"),
  handle: z.string().min(1),
  name: z.string().nullable(),
  org_number: z.string().nullable(),
  address: CompanyAddressSchema.nullable(),
  membersRaw: z.string().nullable(),
});
export type CompanyProfileMetaobjectState = z.infer<
  typeof CompanyProfileMetaobjectStateSchema
>;
