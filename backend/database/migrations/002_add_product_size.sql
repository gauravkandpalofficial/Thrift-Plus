BEGIN;

-- Add the optional size field without changing existing product rows.
-- IF NOT EXISTS makes this migration safe to rerun.
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS size VARCHAR(30);

COMMIT;
