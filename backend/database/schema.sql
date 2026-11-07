
-- ==========================================
-- THRIFT+ DATABASE SCHEMA
-- Initial database tables
-- ==========================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'buyer'
        CHECK (role IN ('buyer', 'seller', 'reviewer', 'admin')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    seller_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,

    name VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    brand VARCHAR(100) DEFAULT 'Unbranded',

    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),

    condition VARCHAR(30) NOT NULL
        CHECK (condition IN ('Like New', 'Very Good', 'Good', 'Fair')),

    image_url TEXT,

    review_status VARCHAR(20) NOT NULL DEFAULT 'not_required'
        CHECK (review_status IN (
            'not_required', 'pending', 'needs_info',
            'approved', 'rejected'
        )),

    approved_min_price NUMERIC(10, 2),
    approved_max_price NUMERIC(10, 2),

    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN (
            'draft', 'pending_review', 'active',
            'rejected', 'sold', 'archived'
        )),

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CHECK (
        (price < 150 AND review_status = 'not_required')
        OR
        (price >= 150 AND review_status <> 'not_required')
    ),

    CHECK (
        approved_min_price IS NULL
        OR approved_min_price >= 0
    ),

    CHECK (
        approved_max_price IS NULL
        OR approved_max_price >= 0
    ),

    CHECK (
        approved_min_price IS NULL
        OR approved_max_price IS NULL
        OR approved_min_price <= approved_max_price
    )
);


-- 3. PRODUCT IMAGES TABLE
CREATE TABLE IF NOT EXISTS product_images (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    product_id INTEGER NOT NULL
        REFERENCES products(id) ON DELETE CASCADE,

    image_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


-- 4. PRODUCT REVIEWS TABLE
CREATE TABLE IF NOT EXISTS product_reviews (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    product_id INTEGER NOT NULL
        REFERENCES products(id) ON DELETE RESTRICT,

    reviewer_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,

    condition_grade VARCHAR(30),
    min_price NUMERIC(10, 2),
    max_price NUMERIC(10, 2),

    decision VARCHAR(20) NOT NULL
        CHECK (decision IN (
            'pending', 'needs_info', 'approved', 'rejected'
        )),

    reviewer_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CHECK (
        min_price IS NULL
        OR max_price IS NULL
        OR min_price <= max_price
    )
);


-- Create useful indexes
CREATE INDEX IF NOT EXISTS idx_products_seller
ON products(seller_id);

CREATE INDEX IF NOT EXISTS idx_products_category
ON products(category);

CREATE INDEX IF NOT EXISTS idx_products_status
ON products(status);

CREATE INDEX IF NOT EXISTS idx_reviews_product
ON product_reviews(product_id);
