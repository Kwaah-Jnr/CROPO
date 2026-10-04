import { GHANA_REGIONS } from "@/config/regions";
import {
  PRODUCE_GRADES,
  PRODUCE_UNITS,
  LISTING_STATUSES,
} from "@/lib/validation/farmer";

export { GHANA_REGIONS, PRODUCE_GRADES, PRODUCE_UNITS, LISTING_STATUSES };

export const ORDER_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "IN_TRANSIT",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED",
  "REJECTED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const BUSINESS_TYPES = [
  "INDIVIDUAL",
  "RETAILER",
  "WHOLESALER",
  "RESTAURANT",
  "PROCESSOR",
  "EXPORTER",
  "OTHER",
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const DELIVERY_METHODS = ["PICKUP", "DELIVERY"] as const;

export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const OFFER_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
  "EXPIRED",
] as const;

export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const REQUEST_STATUSES = [
  "OPEN",
  "FULFILLED",
  "CLOSED",
  "CANCELLED",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];
