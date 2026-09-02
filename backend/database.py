"""
Metropolitan Parking System (MPS) - Database Connection & Seed Data Manager
Handles SQLite persistent storage, schema initialization, seed data population,
and query helper functions.
"""

import sqlite3
import os
import uuid
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "database", "parking_system.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "..", "database", "schema.sql")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_db_connection()
    cursor = conn.cursor()

    if os.path.exists(SCHEMA_PATH):
        with open(SCHEMA_PATH, "r") as f:
            schema_sql = f.read()
            cursor.executescript(schema_sql)

    # Seed data if empty
    cursor.execute("SELECT COUNT(*) FROM Users")
    user_count = cursor.fetchone()[0]

    if user_count == 0:
        seed_db(conn)

    conn.commit()
    conn.close()

def seed_db(conn):
    cursor = conn.cursor()
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    # 1. Seed Users
    users = [
        ("U-ADMIN-1", "AdhithyaJayan R (Admin)", "admin@metropark.org", "+91 9876543210", "ADMIN", "VERIFIED"),
        ("U-DRIVER-1", "AdhithyaJayan R (Driver)", "adhithya@driver.org", "+91 9123456789", "DRIVER", "VERIFIED"),
        ("U-DRIVER-2", "Akshai T (Driver)", "akshai@driver.org", "+91 9123456790", "DRIVER", "VERIFIED"),
        ("U-DRIVER-3", "Dayanand K (Driver)", "dayanand@driver.org", "+91 9123456791", "DRIVER", "VERIFIED"),
        ("U-OWNER-1", "Kavitha Raman (Space Owner)", "kavitha@owner.org", "+91 9988776655", "OWNER", "VERIFIED"),
        ("U-OWNER-2", "Suresh Kumar (Space Owner)", "suresh@owner.org", "+91 9988776656", "OWNER", "VERIFIED"),
        ("U-OWNER-3", "Meena Sundaram (Space Owner)", "meena@owner.org", "+91 9988776657", "OWNER", "PENDING")
    ]

    for u in users:
        cursor.execute(
            "INSERT INTO Users (user_id, full_name, email, phone, role, verification_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (*u, now)
        )

    # 2. Seed Vehicles
    vehicles = [
        ("V-CAR-1", "U-DRIVER-1", "CAR", "TN-37-AZ-1008", "Hyundai i20"),
        ("V-BIKE-1", "U-DRIVER-1", "BIKE", "TN-37-AZ-2009", "Royal Enfield Classic"),
        ("V-CAR-2", "U-DRIVER-2", "CAR", "TN-37-BY-4567", "Tata Nexon EV"),
        ("V-BIKE-2", "U-DRIVER-3", "BIKE", "TN-38-CX-8899", "TVS Jupiter")
    ]

    for v in vehicles:
        cursor.execute(
            "INSERT INTO Vehicles (vehicle_id, driver_id, vehicle_type, license_plate, vehicle_model, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (*v, now)
        )

    # 3. Seed Listings
    listings = [
        ("L-101", "U-OWNER-1", "Green Plaza Private Garage", "12 Tech Park Rd, Near Metro Square", 11.0205, 76.9630, 4, 40.00, "CAR,BIKE", "06:00 - 23:00", "VERIFIED"),
        ("L-102", "U-OWNER-1", "Metropolitan Tower Basement Lot", "45 Commercial Ave", 11.0225, 76.9680, 6, 60.00, "CAR", "24/7", "VERIFIED"),
        ("L-103", "U-OWNER-2", "Heritage Open Driveway", "8 Heritage Cross St", 11.0135, 76.9610, 3, 30.00, "CAR,BIKE", "08:00 - 20:00", "VERIFIED"),
        ("L-104", "U-OWNER-2", "Grand Arcade Secure Parking", "102 Arcade Blvd", 11.0175, 76.9545, 8, 50.00, "CAR,BIKE", "24/7", "VERIFIED"),
        ("L-105", "U-OWNER-3", "EcoPark Covered Bay", "19 Eco Sanctuary Way", 11.0240, 76.9590, 2, 25.00, "BIKE", "07:00 - 22:00", "PENDING")
    ]

    for l in listings:
        cursor.execute(
            "INSERT INTO Listings (listing_id, owner_id, title, address, latitude, longitude, total_capacity, hourly_rate, vehicle_types_allowed, operating_hours, verification_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (*l, now)
        )

    # 4. Seed Slots
    slots = [
        ("S-101-A", "L-101", "A1", "CAR", "AVAILABLE"),
        ("S-101-B", "L-101", "A2", "CAR", "RESERVED"),
        ("S-101-C", "L-101", "B1", "BIKE", "OCCUPIED"),
        ("S-101-D", "L-101", "B2", "BIKE", "AVAILABLE"),
        
        ("S-102-A", "L-102", "G1", "CAR", "AVAILABLE"),
        ("S-102-B", "L-102", "G2", "CAR", "OCCUPIED"),
        ("S-102-C", "L-102", "G3", "CAR", "AVAILABLE"),
        
        ("S-103-A", "L-103", "D1", "CAR", "AVAILABLE"),
        ("S-103-B", "L-103", "D2", "BIKE", "AVAILABLE"),

        ("S-104-A", "L-104", "P1", "CAR", "AVAILABLE"),
        ("S-104-B", "L-104", "P2", "BIKE", "AVAILABLE")
    ]

    for s in slots:
        cursor.execute(
            "INSERT INTO Slots (slot_id, listing_id, slot_number, vehicle_type, status, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (*s, now)
        )

    # 5. Seed Bookings
    bookings = [
        ("B-9001", "U-DRIVER-1", "S-101-B", "V-CAR-1", now, (datetime.utcnow() + timedelta(hours=2)).strftime("%Y-%m-%d %H:%M:%S"), 80.00, "RESERVED"),
        ("B-9002", "U-DRIVER-2", "S-101-C", "V-CAR-2", (datetime.utcnow() - timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S"), (datetime.utcnow() + timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S"), 80.00, "ACTIVE")
    ]

    for b in bookings:
        cursor.execute(
            "INSERT INTO Bookings (booking_id, driver_id, slot_id, vehicle_id, start_time, end_time, total_amount, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (*b, now)
        )

    # 6. Seed Transactions
    transactions = [
        ("TX-701", "B-9001", "U-DRIVER-1", 80.00, 8.00, 72.00, "BOOKING_FEE", "COMPLETED", now),
        ("TX-702", "B-9002", "U-DRIVER-2", 80.00, 8.00, 72.00, "BOOKING_FEE", "COMPLETED", now)
    ]

    for t in transactions:
        cursor.execute(
            "INSERT INTO Transactions (transaction_id, booking_id, user_id, amount, platform_commission, owner_payout, payment_type, payment_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            t
        )

    # 7. Seed System Logs
    logs = [
        ("LOG-001", now, "INFO", "SYSTEM", "DATABASE_INITIALIZED", "Metropolitan Parking System DB populated with initial urban graph seed data", "U-ADMIN-1"),
        ("LOG-002", now, "AUDIT", "STATE_MACHINE", "SLOT_LOCK_ACQUIRED", "Slot S-101-B atomically reserved by driver U-DRIVER-1", "U-DRIVER-1")
    ]

    for lg in logs:
        cursor.execute(
            "INSERT INTO SystemLogs (log_id, timestamp, log_level, module, action, details, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            lg
        )
