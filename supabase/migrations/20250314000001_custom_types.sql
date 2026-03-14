-- Custom enums and types for single-tenant shop

CREATE TYPE app_role AS ENUM (
  'superadmin',
  'admin',
  'member',
  'staff'
);

CREATE TYPE profile_status AS ENUM (
  'active',
  'suspended',
  'inactive'
);

CREATE TYPE order_status AS ENUM (
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled'
);

CREATE TYPE payment_submission_status AS ENUM (
  'pending',
  'verified',
  'rejected'
);

CREATE TYPE stock_movement_type AS ENUM (
  'in',
  'out',
  'adjustment'
);
