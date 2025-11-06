-- Migration: 010_fix_sales_order_items_schema.sql
-- Description: Fix sales_order_items table to properly support quantities and multiple line items

-- First, add quantity column to sales_order_items
ALTER TABLE public.sales_order_items ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1;

-- Change primary key to allow multiple entries of same product per order
-- Drop existing primary key constraint
ALTER TABLE public.sales_order_items DROP CONSTRAINT sales_order_items_pkey;

-- Add auto-incrementing primary key
ALTER TABLE public.sales_order_items ADD COLUMN sales_order_item_id SERIAL PRIMARY KEY;

-- Create unique index to prevent duplicate products in same order (optional - remove if you want to allow multiple line items of same product)
-- CREATE UNIQUE INDEX idx_sales_order_items_unique ON public.sales_order_items(sales_order_id, product_id);

-- Update existing data to have quantity = 1 (since we don't have historical quantity data)
UPDATE public.sales_order_items SET quantity = 1 WHERE quantity IS NULL;