import { z } from "zod";
import { GHANA_REGIONS } from "@/config/regions";
import { PRODUCE_GRADES, PRODUCE_UNITS } from "@/lib/validation/farmer";

export const BUSINESS_TYPES = [
  "INDIVIDUAL",
  "RETAILER",
  "WHOLESALER",
  "RESTAURANT",
  "PROCESSOR",
  "EXPORTER",
  "OTHER",
] as const;

export const DELIVERY_METHODS = ["PICKUP", "DELIVERY"] as const;

export const buyingRequestSchema = z.object({
  crop_name: z
    .string()
    .trim()
    .min(1, "Crop name is required")
    .max(120, "Crop name cannot exceed 120 characters"),
  category_id: z
    .string()
    .uuid("Select a valid crop category")
    .optional()
    .or(z.literal("")),
  quantity: z
    .coerce
    .number()
    .positive("Quantity must be greater than zero"),
  unit: z.enum(PRODUCE_UNITS, {
    message: "Select a valid unit of measure",
  }),
  desired_grade: z
    .enum(PRODUCE_GRADES)
    .optional()
    .or(z.literal("")),
  destination_region: z.string().refine((val) => GHANA_REGIONS.includes(val as (typeof GHANA_REGIONS)[number]), {
    message: "Select a valid Ghanaian destination region",
  }),
  destination_city: z
    .string()
    .trim()
    .max(80, "Destination city/district cannot exceed 80 characters")
    .optional()
    .or(z.literal("")),
  required_by: z
    .string()
    .optional()
    .or(z.literal("")),
  target_price_per_unit: z
    .coerce
    .number()
    .positive("Target price must be greater than zero")
    .optional()
    .or(z.literal(0))
    .or(z.literal("")),
  description: z
    .string()
    .trim()
    .max(4000, "Description cannot exceed 4000 characters")
    .optional()
    .or(z.literal("")),
});

export type BuyingRequestFormValues = z.infer<typeof buyingRequestSchema>;

export const makeOfferSchema = z.object({
  listing_id: z.string().uuid("Invalid produce listing selection"),
  quantity: z
    .coerce
    .number()
    .positive("Offered quantity must be greater than zero"),
  price_per_unit: z
    .coerce
    .number()
    .positive("Offered price per unit must be greater than zero"),
  message: z
    .string()
    .trim()
    .max(1000, "Message cannot exceed 1000 characters")
    .optional()
    .or(z.literal("")),
});

export type MakeOfferFormValues = z.infer<typeof makeOfferSchema>;

export const buyNowSchema = z.object({
  listing_id: z.string().uuid("Invalid produce listing selection"),
  quantity: z
    .coerce
    .number()
    .positive("Purchase volume must be greater than zero"),
  delivery_method: z.enum(DELIVERY_METHODS, {
    message: "Select a fulfillment method (PICKUP or DELIVERY)",
  }),
  delivery_address: z
    .string()
    .trim()
    .max(500, "Delivery address cannot exceed 500 characters")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(1000, "Notes cannot exceed 1000 characters")
    .optional()
    .or(z.literal("")),
}).refine(
  (data) => {
    if (data.delivery_method === "DELIVERY") {
      return Boolean(data.delivery_address && data.delivery_address.trim().length > 0);
    }
    return true;
  },
  {
    message: "Delivery destination address is required when choosing Delivery fulfillment",
    path: ["delivery_address"],
  }
);

export type BuyNowFormValues = z.infer<typeof buyNowSchema>;

export const buyerProfileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Contact name must be at least 2 characters")
    .max(120, "Contact name cannot exceed 120 characters"),
  phone: z
    .string()
    .trim()
    .regex(/^(0|\+233)[0-9]{9}$/, "Enter a valid Ghanaian phone number (e.g. 0244123456)")
    .optional()
    .or(z.literal("")),
  business_name: z
    .string()
    .trim()
    .min(2, "Business / Trade name must be at least 2 characters")
    .max(120, "Business name cannot exceed 120 characters")
    .optional()
    .or(z.literal("")),
  business_type: z.enum(BUSINESS_TYPES).default("RETAILER"),
  region: z.string().refine((val) => val === "" || GHANA_REGIONS.includes(val as (typeof GHANA_REGIONS)[number]), {
    message: "Select a valid Ghanaian region",
  }).optional().or(z.literal("")),
  city: z
    .string()
    .trim()
    .max(80, "City/Town cannot exceed 80 characters")
    .optional()
    .or(z.literal("")),
});

export type BuyerProfileFormValues = z.infer<typeof buyerProfileSchema>;

export const farmerRequestOfferSchema = z.object({
  request_id: z.string().uuid("Invalid buying request"),
  listing_id: z.string().uuid("Invalid listing selection").optional().or(z.literal("")),
  quantity: z
    .coerce
    .number()
    .positive("Offered volume must be greater than zero"),
  price_per_unit: z
    .coerce
    .number()
    .positive("Quote price must be greater than zero"),
  available_date: z
    .string()
    .optional()
    .or(z.literal("")),
  message: z
    .string()
    .trim()
    .max(1000, "Message cannot exceed 1000 characters")
    .optional()
    .or(z.literal("")),
});

export type FarmerRequestOfferValues = z.infer<typeof farmerRequestOfferSchema>;
