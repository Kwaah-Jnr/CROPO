import type { Database } from "@/types/database.types";

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

export type UserRole = Enums<"user_role">;
export type VerificationStatus = Enums<"verification_status">;
export type ListingStatus = Enums<"listing_status">;
export type OrderStatus = Enums<"order_status">;
export type OrderSource = Enums<"order_source">;

export type Profile = Tables<"profiles">;

/** The minimal profile shape used for auth/role decisions. */
export type SessionProfile = Pick<Profile, "id" | "role" | "full_name">;
