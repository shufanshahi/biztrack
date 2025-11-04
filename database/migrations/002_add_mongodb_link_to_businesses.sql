-- Add mongodb_link column to businesses table
ALTER TABLE public.businesses ADD COLUMN mongodb_link TEXT;
ALTER TABLE public.businesses ADD COLUMN sql_link TEXT;
