-- Worker Portfolio Management System
-- Tables for service portfolios, galleries, testimonials, and pricing

-- Worker service portfolios
CREATE TABLE IF NOT EXISTS worker_portfolios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category_name TEXT, -- Store category name directly instead of ID
    service_type TEXT NOT NULL, -- 'plumbing', 'electrical', 'cleaning', etc.
    base_price DECIMAL(10,2),
    price_unit TEXT, -- 'hour', 'project', 'sqft', etc.
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    view_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio image galleries
CREATE TABLE IF NOT EXISTS portfolio_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    portfolio_id INTEGER NOT NULL,
    image_name TEXT NOT NULL,
    image_data TEXT NOT NULL, -- Base64 encoded image
    image_type TEXT NOT NULL, -- MIME type
    image_size INTEGER NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    caption TEXT,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Client testimonials and reviews
CREATE TABLE IF NOT EXISTS portfolio_testimonials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    portfolio_id INTEGER NOT NULL,
    job_id INTEGER,
    client_id INTEGER NOT NULL,
    client_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_title TEXT,
    review_content TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    helpful_votes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Service pricing tiers
CREATE TABLE IF NOT EXISTS portfolio_pricing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    portfolio_id INTEGER NOT NULL,
    tier_name TEXT NOT NULL, -- 'Basic', 'Standard', 'Premium'
    tier_description TEXT,
    price DECIMAL(10,2) NOT NULL,
    price_unit TEXT NOT NULL,
    features TEXT, -- JSON array of features
    estimated_duration TEXT, -- '2-3 hours', '1-2 days', etc.
    is_popular BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio service areas
CREATE TABLE IF NOT EXISTS portfolio_service_areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    portfolio_id INTEGER NOT NULL,
    area_name TEXT NOT NULL,
    postal_code TEXT,
    city TEXT,
    state TEXT,
    travel_fee DECIMAL(10,2) DEFAULT 0.00,
    max_distance INTEGER, -- in miles/km
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio tags for better searchability
CREATE TABLE IF NOT EXISTS portfolio_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    portfolio_id INTEGER NOT NULL,
    tag_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Before/After project showcases
CREATE TABLE IF NOT EXISTS portfolio_showcases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    portfolio_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    before_image_data TEXT, -- Base64 encoded
    after_image_data TEXT,  -- Base64 encoded
    project_duration TEXT,
    project_cost DECIMAL(10,2),
    client_testimonial TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio statistics tracking
CREATE TABLE IF NOT EXISTS portfolio_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    portfolio_id INTEGER NOT NULL,
    stat_date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    inquiries INTEGER DEFAULT 0,
    bookings INTEGER DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_worker_portfolios_worker_id ON worker_portfolios(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_portfolios_category ON worker_portfolios(category_name);
CREATE INDEX IF NOT EXISTS idx_worker_portfolios_service_type ON worker_portfolios(service_type);
CREATE INDEX IF NOT EXISTS idx_worker_portfolios_featured ON worker_portfolios(is_featured, is_active);

CREATE INDEX IF NOT EXISTS idx_portfolio_images_portfolio_id ON portfolio_images(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_images_primary ON portfolio_images(portfolio_id, is_primary);

CREATE INDEX IF NOT EXISTS idx_portfolio_testimonials_portfolio_id ON portfolio_testimonials(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_testimonials_rating ON portfolio_testimonials(portfolio_id, rating);
CREATE INDEX IF NOT EXISTS idx_portfolio_testimonials_approved ON portfolio_testimonials(is_approved, is_featured);

CREATE INDEX IF NOT EXISTS idx_portfolio_pricing_portfolio_id ON portfolio_pricing(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_pricing_order ON portfolio_pricing(portfolio_id, display_order);

CREATE INDEX IF NOT EXISTS idx_portfolio_service_areas_portfolio_id ON portfolio_service_areas(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_tags_portfolio_id ON portfolio_tags(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_showcases_portfolio_id ON portfolio_showcases(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_stats_portfolio_date ON portfolio_stats(portfolio_id, stat_date);

-- Portfolio migration complete - categories managed separately