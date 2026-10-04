-- Cropo: controlled status values.
-- Enums are the single source of truth for every status column.

create extension if not exists pgcrypto with schema extensions;

create type public.user_role as enum ('FARMER', 'BUYER', 'ADMIN');

create type public.verification_status as enum ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

create type public.business_type as enum (
  'INDIVIDUAL', 'RETAILER', 'WHOLESALER', 'RESTAURANT', 'PROCESSOR', 'EXPORTER', 'OTHER'
);

create type public.listing_status as enum ('DRAFT', 'ACTIVE', 'PAUSED', 'SOLD_OUT', 'REMOVED');

create type public.produce_unit as enum ('KG', 'TONNE', 'BAG', 'CRATE', 'BOX', 'BUNCH', 'PIECE');

create type public.produce_grade as enum ('A', 'B', 'C', 'UNGRADED');

create type public.offer_status as enum ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED');

create type public.request_status as enum ('OPEN', 'FULFILLED', 'CLOSED', 'CANCELLED');

create type public.order_source as enum ('BUY_NOW', 'OFFER', 'REQUEST');

create type public.order_status as enum (
  'PENDING', 'ACCEPTED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP',
  'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'DISPUTED', 'REJECTED'
);

create type public.delivery_method as enum ('PICKUP', 'DELIVERY');

create type public.notification_type as enum (
  'NEW_OFFER', 'OFFER_ACCEPTED', 'OFFER_REJECTED', 'NEW_ORDER', 'ORDER_ACCEPTED',
  'ORDER_STATUS_CHANGED', 'NEW_BUYING_REQUEST', 'FARMER_RESPONSE'
);

create type public.verification_submission_type as enum ('FARMER_IDENTITY', 'FARM', 'BUSINESS');

create type public.submission_status as enum ('PENDING', 'APPROVED', 'REJECTED');

create type public.dispute_status as enum ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED');
