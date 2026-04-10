import { z } from "zod";

export const CompanyOrderPaymentStatusSchema = z.enum([
  "PAID",
  "PARTIALLY_PAID",
  "PENDING",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "VOIDED",
  "UNKNOWN",
]);
export type CompanyOrderPaymentStatus = z.infer<typeof CompanyOrderPaymentStatusSchema>;

export const CompanyOrderFulfillmentStatusSchema = z.enum([
  "FULFILLED",
  "PARTIALLY_FULFILLED",
  "UNFULFILLED",
  "SCHEDULED",
  "ON_HOLD",
  "REQUEST_DECLINED",
  "OPEN",
  "IN_PROGRESS",
  "UNKNOWN",
]);
export type CompanyOrderFulfillmentStatus = z.infer<typeof CompanyOrderFulfillmentStatusSchema>;

export const CompanyOrderSchema = z.object({
  orderId: z.string().min(1),
  orderNumber: z.string().min(1),
  placedAt: z.string().datetime(),
  placedByCustomerId: z.string().min(1),
  placedByDisplayName: z.string().min(1).nullable(),
  paymentStatus: CompanyOrderPaymentStatusSchema,
  fulfillmentStatus: CompanyOrderFulfillmentStatusSchema,
  totalAmount: z.string().min(1),
  currencyCode: z.string().min(3).max(3),
});
export type CompanyOrder = z.infer<typeof CompanyOrderSchema>;

export const CompanyOrderAddressSchema = z.object({
  name: z.string().min(1).nullable(),
  company: z.string().min(1).nullable(),
  line1: z.string().min(1).nullable(),
  line2: z.string().min(1).nullable(),
  postalCode: z.string().min(1).nullable(),
  city: z.string().min(1).nullable(),
  countryCode: z.string().min(2).max(2).nullable(),
  phone: z.string().min(1).nullable(),
});
export type CompanyOrderAddress = z.infer<typeof CompanyOrderAddressSchema>;

export const CompanyOrderLineItemSchema = z.object({
  title: z.string().min(1),
  sku: z.string().min(1).nullable(),
  quantity: z.number().int().nonnegative(),
  unitPrice: z.string().min(1),
  lineTotal: z.string().min(1),
});
export type CompanyOrderLineItem = z.infer<typeof CompanyOrderLineItemSchema>;

export const CompanyOrderTotalsSchema = z.object({
  subtotal: z.string().min(1),
  shipping: z.string().min(1),
  tax: z.string().min(1),
  discounts: z.string().min(1),
  total: z.string().min(1),
  currencyCode: z.string().min(3).max(3),
});
export type CompanyOrderTotals = z.infer<typeof CompanyOrderTotalsSchema>;

export const ListCompanyOrdersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).optional(),
});
export type ListCompanyOrdersQuery = z.infer<typeof ListCompanyOrdersQuerySchema>;

export const ListCompanyOrdersOutputSchema = z.object({
  orders: z.array(CompanyOrderSchema),
  pageInfo: z.object({
    hasNextPage: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type ListCompanyOrdersOutput = z.infer<typeof ListCompanyOrdersOutputSchema>;

export const GetCompanyOrderByIdParamsSchema = z.object({
  orderId: z.string().trim().min(1),
});
export type GetCompanyOrderByIdParams = z.infer<typeof GetCompanyOrderByIdParamsSchema>;

export const GetCompanyOrderByIdOutputSchema = z.object({
  order: CompanyOrderSchema.extend({
    lineItems: z.array(CompanyOrderLineItemSchema),
    totals: CompanyOrderTotalsSchema,
    shippingAddress: CompanyOrderAddressSchema.nullable(),
    billingAddress: CompanyOrderAddressSchema.nullable(),
  }),
});
export type GetCompanyOrderByIdOutput = z.infer<typeof GetCompanyOrderByIdOutputSchema>;
