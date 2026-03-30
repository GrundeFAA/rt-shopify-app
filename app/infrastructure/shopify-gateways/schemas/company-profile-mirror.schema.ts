import { z } from "zod";
import { CompanyAddressSchema } from "../../../contracts/company.schema";

export const ShopifyGraphqlResponseSchema = z.object({
  errors: z
    .array(
      z.object({
        message: z.string(),
      }),
    )
    .optional(),
  data: z.unknown().optional(),
});

export const MirrorMetafieldAddressValueSchema = CompanyAddressSchema;

export const ReadCompanyMetaobjectQueryDataSchema = z.object({
  metaobjectByHandle: z
    .object({
      id: z.string().min(1),
      nameField: z
        .object({
          value: z.string().nullable(),
        })
        .nullable()
        .optional(),
      orgNumberField: z
        .object({
          value: z.string().nullable(),
        })
        .nullable()
        .optional(),
      addressField: z
        .object({
          value: z.string().nullable(),
        })
        .nullable()
        .optional(),
      membersField: z
        .object({
          value: z.string().nullable(),
        })
        .nullable()
        .optional(),
    })
    .nullable(),
});

export const FindCompanyMetaobjectByOrgNumberQueryDataSchema = z.object({
  metaobjects: z.object({
    nodes: z.array(
      z.object({
        id: z.string().min(1),
        handle: z.string().min(1),
        orgNumberField: z
          .object({
            value: z.string().nullable(),
          })
          .nullable()
          .optional(),
      }),
    ),
  }),
});

export const MetaobjectUpsertMutationDataSchema = z.object({
  metaobjectUpsert: z.object({
    metaobject: z
      .object({
        id: z.string().min(1),
      })
      .nullable()
      .optional(),
    userErrors: z.array(
      z.object({
        field: z.array(z.string()).nullable().optional(),
        message: z.string(),
        code: z.string().nullable().optional(),
      }),
    ),
  }),
});
