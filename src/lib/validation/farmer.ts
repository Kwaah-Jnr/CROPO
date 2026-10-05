import { z } from "zod";
import { GHANA_REGIONS } from "@/config/regions";

export const PRODUCE_UNITS = ["KG", "TONNE", "BAG", "CRATE", "BOX", "BUNCH", "PIECE"] as const;
export const PRODUCE_GRADES = ["A", "B", "C", "UNGRADED"] as const;
export const LISTING_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "SOLD_OUT", "REMOVED"] as const;

export const listingSchema = z.object({
  crop_name: z
    .string()
    .trim()
    .min(1, "Crop name is required")
    .max(120, "Crop name cannot exceed 120 characters"),
  variety: z
    .string()
    .trim()
    .max(120, "Variety cannot exceed 120 characters")
    .optional()
    .or(z.literal("")),
  category_id: z
    .string()
    .uuid("Invalid category selection"),
  farm_id: z
    .string()
    .uuid("Invalid farm selection")
    .optional()
    .or(z.literal("")),
  quantity_available: z
    .coerce
    .number()
    .positive("Quantity must be greater than zero"),
  unit: z.enum(PRODUCE_UNITS, {
    message: "Select a valid unit of measure",
  }),
  price_per_unit: z
    .coerce
    .number()
    .positive("Price must be greater than zero"),
  grade: z.enum(PRODUCE_GRADES, {
    message: "Select a valid quality grade",
  }),
  harvest_date: z
    .string()
    .optional()
    .or(z.literal("")),
  available_date: z
    .string()
    .optional()
    .or(z.literal("")),
  region: z.string().refine((val) => GHANA_REGIONS.includes(val as (typeof GHANA_REGIONS)[number]), {
    message: "Select a valid Ghanaian agricultural region",
  }),
  city: z
    .string()
    .trim()
    .max(80, "City/District cannot exceed 80 characters")
    .optional()
    .or(z.literal("")),
  description: z
    .string()
    .trim()
    .max(4000, "Description cannot exceed 4000 characters")
    .optional()
    .or(z.literal("")),
  delivery_available: z
    .union([z.boolean(), z.string()])
    .nullish()
    .transform((val) => val === true || val === "true" || val === "on"),
  status: z.enum(LISTING_STATUSES).default("ACTIVE"),
  expected_version: z.coerce.number().int().optional(),
});

export type ListingFormValues = z.infer<typeof listingSchema>;

export const listingStatusSchema = z.object({
  status: z.enum(LISTING_STATUSES, {
    message: "Invalid status selection",
  }),
});

export const farmerProfileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(120, "Name cannot exceed 120 characters"),
  phone: z
    .string()
    .trim()
    .regex(/^(0|\+233)[0-9]{9}$/, "Enter a valid Ghanaian phone number (e.g. 0244123456)")
    .optional()
    .or(z.literal("")),
  region: z.string().refine((val) => val === "" || GHANA_REGIONS.includes(val as (typeof GHANA_REGIONS)[number]), {
    message: "Select a valid Ghanaian region",
  }).optional().or(z.literal("")),
  city: z
    .string()
    .trim()
    .max(80, "City/Town cannot exceed 80 characters")
    .optional()
    .or(z.literal("")),
  bio: z
    .string()
    .trim()
    .max(2000, "Bio cannot exceed 2000 characters")
    .optional()
    .or(z.literal("")),
  years_farming: z
    .coerce
    .number()
    .int("Years must be a whole number")
    .min(0, "Years cannot be negative")
    .max(80, "Years cannot exceed 80")
    .optional()
    .or(z.literal("")),
});

export const farmSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z
    .string()
    .trim()
    .min(2, "Farm name must be at least 2 characters")
    .max(120, "Farm name cannot exceed 120 characters"),
  region: z.string().refine((val) => GHANA_REGIONS.includes(val as (typeof GHANA_REGIONS)[number]), {
    message: "Select a valid Ghanaian region",
  }),
  district: z
    .string()
    .trim()
    .max(80, "District cannot exceed 80 characters")
    .optional()
    .or(z.literal("")),
  community: z
    .string()
    .trim()
    .max(120, "Community / town cannot exceed 120 characters")
    .optional()
    .or(z.literal("")),
  size_hectares: z
    .coerce
    .number()
    .positive("Farm size must be greater than zero")
    .max(100000, "Farm size exceeds maximum allowable")
    .optional()
    .or(z.literal("")),
});

export const VERIFICATION_SUBMISSION_TYPES = ["FARMER_IDENTITY", "FARM"] as const;

export const verificationSubmissionSchema = z
  .object({
    type: z.enum(VERIFICATION_SUBMISSION_TYPES, {
      message: "Select a valid verification submission type",
    }),
    farm_id: z
      .string()
      .uuid("Invalid farm selection")
      .optional()
      .or(z.literal("")),
    notes: z
      .string()
      .trim()
      .max(2000, "Notes cannot exceed 2000 characters")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.type === "FARM") {
        return !!data.farm_id;
      }
      return true;
    },
    {
      message: "A farm must be selected for farm land verification",
      path: ["farm_id"],
    }
  );

export type VerificationSubmissionFormValues = z.infer<typeof verificationSubmissionSchema>;

