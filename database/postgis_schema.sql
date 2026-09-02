-- =============================================================================
-- METROPOLITAN PARKING SYSTEM (MPS) - POSTGRESQL + POSTGIS SPATIAL SCHEMA
-- Academic Project: Sri Eshwar College of Engineering, CSE Dept (Batch 12 / IDEATORS)
-- Database Architecture: PostgreSQL 15+ with PostGIS 3.3 Extension
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. ENUM TYPES DEFINITIONS
CREATE TYPE user_role AS ENUM ('ROLE_DRIVER', 'ROLE_OWNER', 'ROLE_ADMIN');
CREATE TYPE vehicle_type AS ENUM ('CAR', 'BIKE');
CREATE TYPE slot_status AS ENUM ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE');
CREATE TYPE booking_status AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- 2. USERS TABLE
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    role user_role NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. VEHICLES TABLE
CREATE TABLE vehicles (
    id BIGSERIAL PRIMARY KEY,
    driver_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    vehicle_type vehicle_type NOT NULL,
    model VARCHAR(50)
);

-- 4. PARKING SPACES TABLE (WITH POSTGIS GEOGRAPHY INDEX)
CREATE TABLE parking_spaces (
    id BIGSERIAL PRIMARY KEY,
    owner_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    hourly_rate DECIMAL(10, 2) NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_parking_spaces_location ON parking_spaces USING GIST(location);

-- 5. PARKING SLOTS TABLE
CREATE TABLE parking_slots (
    id BIGSERIAL PRIMARY KEY,
    space_id BIGINT REFERENCES parking_spaces(id) ON DELETE CASCADE,
    slot_number VARCHAR(20) NOT NULL,
    supported_vehicle vehicle_type NOT NULL,
    status slot_status DEFAULT 'AVAILABLE',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. BOOKINGS TABLE
CREATE TABLE bookings (
    id BIGSERIAL PRIMARY KEY,
    driver_id BIGINT REFERENCES users(id),
    slot_id BIGINT REFERENCES parking_slots(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status booking_status DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. TRANSACTIONS TABLE
CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT REFERENCES bookings(id),
    amount DECIMAL(10, 2) NOT NULL,
    commission_fee DECIMAL(10, 2) NOT NULL,
    owner_payout DECIMAL(10, 2) NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. SYSTEM LOGS TABLE
CREATE TABLE system_logs (
    id BIGSERIAL PRIMARY KEY,
    level VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
