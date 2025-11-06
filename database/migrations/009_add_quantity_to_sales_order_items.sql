-- Migration: 009_add_quantity_to_sales_order_items.sql
-- Description: Adds quantity field to sales_order_items table for proper inventory tracking

-- Add quantity column to sales_order_items table
ALTER TABLE public.sales_order_items
ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1;

-- Add check constraint to ensure quantity is positive
ALTER TABLE public.sales_order_items
ADD CONSTRAINT sales_order_items_quantity_check
CHECK (quantity > 0);

-- Update existing records to have quantity = 1 (assuming each record represents 1 unit)
-- This is a safe default since we don't have historical quantity data
UPDATE public.sales_order_items
SET quantity = 1
WHERE quantity IS NULL;