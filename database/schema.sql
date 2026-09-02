-- =============================================================================
-- METROPOLITAN PARKING SYSTEM (MPS) - DATABASE DDL SCHEMA
-- Academic Project: Sri Eshwar College of Engineering, CSE Dept (Batch 12 / IDEATORS)
-- Database Architecture: Relational Schema with PostGIS/Geospatial compatibility
-- =============================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS Users (
    user_id VARCHAR(36) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('DRIVER', 'OWNER', 'ADMIN')) NOT NULL,
    verification_status VARCHAR(20) CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. VEHICLES TABLE
CREATE TABLE IF NOT EXISTS Vehicles (
    vehicle_id VARCHAR(36) PRIMARY KEY,
    driver_id VARCHAR(36) NOT NULL,
    vehicle_type VARCHAR(10) CHECK (vehicle_type IN ('CAR', 'BIKE')) NOT NULL,
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    vehicle_model VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- 3. LISTINGS TABLE
CREATE TABLE IF NOT EXISTS Listings (
    listing_id VARCHAR(36) PRIMARY KEY,
    owner_id VARCHAR(36) NOT NULL,
    title VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    total_capacity INT NOT NULL CHECK (total_capacity > 0),
    hourly_rate DECIMAL(8, 2) NOT NULL CHECK (hourly_rate >= 0),
    vehicle_types_allowed VARCHAR(20) NOT NULL, -- e.g. 'CAR,BIKE'
    operating_hours VARCHAR(50) DEFAULT '24/7',
    verification_status VARCHAR(20) CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- 4. SLOTS TABLE
CREATE TABLE IF NOT EXISTS Slots (
    slot_id VARCHAR(36) PRIMARY KEY,
    listing_id VARCHAR(36) NOT NULL,
    slot_number VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(10) CHECK (vehicle_type IN ('CAR', 'BIKE')) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('AVAILABLE', 'RESERVED', 'OCCUPIED')) DEFAULT 'AVAILABLE',
    locked_until TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES Listings(listing_id) ON DELETE CASCADE,
    UNIQUE (listing_id, slot_number)
);

-- 5. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS Bookings (
    booking_id VARCHAR(36) PRIMARY KEY,
    driver_id VARCHAR(36) NOT NULL,
    slot_id VARCHAR(36) NOT NULL,
    vehicle_id VARCHAR(36) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('RESERVED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED')) DEFAULT 'RESERVED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES Users(user_id),
    FOREIGN KEY (slot_id) REFERENCES Slots(slot_id),
    FOREIGN KEY (vehicle_id) REFERENCES Vehicles(vehicle_id)
);

-- 6. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS Transactions (
    transaction_id VARCHAR(36) PRIMARY KEY,
    booking_id VARCHAR(36) NULL,
    user_id VARCHAR(36) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    platform_commission DECIMAL(10, 2) DEFAULT 0.00,
    owner_payout DECIMAL(10, 2) DEFAULT 0.00,
    payment_type VARCHAR(30) CHECK (payment_type IN ('BOOKING_FEE', 'OWNER_WITHDRAWAL')) NOT NULL,
    payment_status VARCHAR(20) CHECK (payment_status IN ('COMPLETED', 'PENDING', 'FAILED')) DEFAULT 'COMPLETED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id)
);

-- 7. SYSTEM LOGS TABLE
CREATE TABLE IF NOT EXISTS SystemLogs (
    log_id VARCHAR(36) PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    log_level VARCHAR(10) CHECK (log_level IN ('INFO', 'WARN', 'ERROR', 'AUDIT')) NOT NULL,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    user_id VARCHAR(36) NULL
);

-- INDEXES FOR PERFORMANCE OPTIMIZATION
CREATE INDEX IF NOT EXISTS idx_listings_owner ON Listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_slots_listing ON Slots(listing_id);
CREATE INDEX IF NOT EXISTS idx_slots_status ON Slots(status);
CREATE INDEX IF NOT EXISTS idx_bookings_driver ON Bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON Bookings(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON Transactions(user_id);
