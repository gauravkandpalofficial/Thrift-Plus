
BEGIN;

-- Step 1: Add a separate gender column
ALTER TABLE products
ADD COLUMN IF NOT EXISTS gender VARCHAR(20);

-- Step 2: Move the existing gender values
-- from category into the new gender column
UPDATE products
SET gender = CASE
    WHEN category = 'Men' THEN 'Men'
    WHEN category = 'Women' THEN 'Women'
    ELSE 'Unisex'
END
WHERE gender IS NULL;

-- Step 3: Correct the clothing categories
UPDATE products
SET category = CASE
    WHEN name = 'Classic Cotton T-Shirt' THEN 'T-Shirts'
    WHEN name = 'Casual White Shirt' THEN 'Shirts'
    WHEN name = 'Denim Shorts' THEN 'Shorts'
    ELSE category
END;

-- Step 4: Set the default gender
ALTER TABLE products
ALTER COLUMN gender SET DEFAULT 'Unisex';

ALTER TABLE products
ALTER COLUMN gender SET NOT NULL;

-- Step 5: Restrict category values
ALTER TABLE products
ADD CONSTRAINT products_category_check
CHECK (
    category IN (
        'Shirts',
        'T-Shirts',
        'Jeans',
        'Shorts',
        'Jackets'
    )
);

-- Step 6: Restrict gender values
ALTER TABLE products
ADD CONSTRAINT products_gender_check
CHECK (
    gender IN ('Men', 'Women', 'Unisex')
);

COMMIT;
