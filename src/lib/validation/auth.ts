import { z } from "zod";

import { SIGNUP_ROLES } from "@/lib/auth/roles";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your email address.")
  .max(254, "Email address is too long.")
  .pipe(z.email("Enter a valid email address."));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(72, "Password is too long."),
});

export const signupSchema = z
  .object({
    role: z.enum(SIGNUP_ROLES, { message: "Choose whether you are a farmer or a buyer." }),
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name.")
      .max(120, "Name must be 120 characters or fewer."),
    businessName: z
      .string()
      .trim()
      .max(160, "Business name must be 160 characters or fewer.")
      .optional()
      .transform((value) => (value ? value : undefined)),
    email,
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72, "Password must be 72 characters or fewer.")
      .regex(/[A-Za-z]/, "Password must contain a letter.")
      .regex(/[0-9]/, "Password must contain a number."),
  })
  .transform((data) => ({
    ...data,
    // Business name only applies to buyers.
    businessName: data.role === "BUYER" ? data.businessName : undefined,
  }));

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
