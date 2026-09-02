/**
 * MetroPark - Standalone Client-Side Local Database & Persistent State
 * Simulates SQLite database tables using localStorage for 100% backend-free execution.
 */

const STORAGE_KEYS = {
  USERS: "mps_db_users",
  LISTINGS: "mps_db_listings",
  SLOTS: "mps_db_slots",
  BOOKINGS: "mps_db_bookings",
  TRANSACTIONS: "mps_db_transactions",
  LOGS: "mps_db_logs",
  VERIFICATIONS: "mps_db_verifications"
};

// Initial Seed Data for Standalone Operation
const SEED_DATA = {
  USERS: [
    { user_id: "U-ADMIN-1", full_name: "AdhithyaJayan R (Admin)", email: "admin@metropark.org", phone: "+91 9876543210", role: "ADMIN", verification_status: "VERIFIED" },
    { user_id: "U-DRIVER-1", full_name: "AdhithyaJayan R (Driver)", email: "driver@metropark.org", phone: "+91 9123456789", role: "DRIVER", vehicle_type: "CAR", vehicle_model: "Honda City", license_plate: "TN-37-AX-1008", verification_status: "VERIFIED" },
    { user_id: "U-DRIVER-2", full_name: "Akshai T", email: "akshai@driver.org", phone: "+91 9123456790", role: "DRIVER", vehicle_type: "CAR", vehicle_model: "Hyundai i20", license_plate: "TN-37-BZ-2004", verification_status: "VERIFIED" },
    { user_id: "U-DRIVER-3", full_name: "Dayanand K", email: "dayanand@driver.org", phone: "+91 9123456791", role: "DRIVER", vehicle_type: "BIKE", vehicle_model: "Royal Enfield", license_plate: "TN-37-CZ-3009", verification_status: "VERIFIED" },
    { user_id: "U-OWNER-1", full_name: "Kavitha Raman", email: "owner@metropark.org", phone: "+91 9988776655", role: "OWNER", verification_status: "VERIFIED" },
    { user_id: "U-OWNER-2", full_name: "Suresh Kumar", email: "suresh@owner.org", phone: "+91 9988776656", role: "OWNER", verification_status: "VERIFIED" }
  ],
  LISTINGS: [
    { property_id: "P-101", owner_id: "U-OWNER-1", title: "Green Plaza Private Garage", address: "12 Tech Park Rd, Near Metro Station", hourly_rate: 40, capacity: 4, verification_status: "VERIFIED", lat: 11.0180, lng: 76.9650, node_id: "N3" },
    { property_id: "P-102", owner_id: "U-OWNER-1", title: "Metropolitan Tower Basement Lot", address: "100 Feet Rd, CBD Square", hourly_rate: 50, capacity: 6, verification_status: "VERIFIED", lat: 11.0250, lng: 76.9580, node_id: "N2" },
    { property_id: "P-103", owner_id: "U-OWNER-2", title: "EcoPark Covered Bay", address: "19 Eco Sanctuary Way, South Blvd", hourly_rate: 30, capacity: 2, verification_status: "VERIFIED", lat: 10.9980, lng: 76.9690, node_id: "N4" }
  ],
  SLOTS: [
    { slot_id: "S-101-A", property_id: "P-101", title: "Green Plaza Private Garage", slot_number: "Bay A1", vehicle_category: "CAR", hourly_rate: 40, status: "AVAILABLE", node_id: "N3", lat: 11.0180, lng: 76.9650, locked_until: null },
    { slot_id: "S-101-B", property_id: "P-101", title: "Green Plaza Private Garage", slot_number: "Bay A2", vehicle_category: "CAR", hourly_rate: 40, status: "AVAILABLE", node_id: "N3", lat: 11.0182, lng: 76.9652, locked_until: null },
    { slot_id: "S-101-C", property_id: "P-101", title: "Green Plaza Private Garage", slot_number: "Bay B1 (Bike)", vehicle_category: "BIKE", hourly_rate: 20, status: "OCCUPIED", node_id: "N3", lat: 11.0178, lng: 76.9648, locked_until: null },
    { slot_id: "S-101-D", property_id: "P-101", title: "Green Plaza Private Garage", slot_number: "Bay B2 (Bike)", vehicle_category: "BIKE", hourly_rate: 20, status: "AVAILABLE", node_id: "N3", lat: 11.0179, lng: 76.9649, locked_until: null },
    { slot_id: "S-102-A", property_id: "P-102", title: "Metropolitan Tower Basement Lot", slot_number: "Slot G1", vehicle_category: "CAR", hourly_rate: 50, status: "AVAILABLE", node_id: "N2", lat: 11.0250, lng: 76.9580, locked_until: null },
    { slot_id: "S-102-B", property_id: "P-102", title: "Metropolitan Tower Basement Lot", slot_number: "Slot G2", vehicle_category: "CAR", hourly_rate: 50, status: "OCCUPIED", node_id: "N2", lat: 11.0252, lng: 76.9582, locked_until: null },
    { slot_id: "S-102-C", property_id: "P-102", title: "Metropolitan Tower Basement Lot", slot_number: "Slot G3", vehicle_category: "CAR", hourly_rate: 50, status: "AVAILABLE", node_id: "N2", lat: 11.0248, lng: 76.9578, locked_until: null },
    { slot_id: "S-103-A", property_id: "P-103", title: "EcoPark Covered Bay", slot_number: "Spot E1", vehicle_category: "CAR", hourly_rate: 30, status: "AVAILABLE", node_id: "N4", lat: 10.9980, lng: 76.9690, locked_until: null }
  ],
  BOOKINGS: [
    { booking_id: "B-901", driver_id: "U-DRIVER-1", slot_id: "S-101-A", total_fee: 40, status: "COMPLETED", created_at: "2026-09-02 10:15:00" },
    { booking_id: "B-902", driver_id: "U-DRIVER-2", slot_id: "S-102-B", total_fee: 100, status: "CONFIRMED", created_at: "2026-09-02 11:30:00" }
  ],
  TRANSACTIONS: [
    { txn_id: "TXN-801", booking_id: "B-901", gross_amount: 40.00, platform_fee: 4.00, owner_payout: 36.00, status: "SUCCESS" },
    { txn_id: "TXN-802", booking_id: "B-902", gross_amount: 100.00, platform_fee: 10.00, owner_payout: 90.00, status: "SUCCESS" }
  ],
  LOGS: [
    { timestamp: new Date().toLocaleTimeString(), event: "SYSTEM_INIT: Standalone Pure Frontend Application initialized." },
    { timestamp: new Date().toLocaleTimeString(), event: "GRAPH_ENGINE: Client-side Dijkstra engine and OSRM polyline routing active." },
    { timestamp: new Date().toLocaleTimeString(), event: "STATE_WORKER: Local 15-minute countdown state daemon initialized." }
  ],
  VERIFICATIONS: [
    { id: "V-101", type: "OWNER", name: "Ramesh Kumar", details: "Sunrise Residency Driveway (2 Slots @ ₹35/hr)" },
    { id: "V-102", type: "DRIVER", name: "Vikram Seth", details: "Vehicle TN-38-BZ-4412 (Verified RC)" }
  ]
};

// Database Initialization & Accessor API
class LocalDatabase {
  static init() {
    Object.keys(STORAGE_KEYS).forEach(key => {
      if (!localStorage.getItem(STORAGE_KEYS[key])) {
        localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(SEED_DATA[key]));
      }
    });
  }

  static getTable(tableName) {
    const key = STORAGE_KEYS[tableName];
    if (!key) return [];
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
      return SEED_DATA[tableName] || [];
    }
  }

  static setTable(tableName, data) {
    const key = STORAGE_KEYS[tableName];
    if (key) {
      localStorage.setItem(key, JSON.stringify(data));
    }
  }

  // Helper Mutation Operations
  static addLog(eventMessage) {
    const logs = this.getTable("LOGS");
    logs.unshift({
      timestamp: new Date().toLocaleTimeString(),
      event: eventMessage
    });
    if (logs.length > 100) logs.pop();
    this.setTable("LOGS", logs);
  }

  static updateSlotStatus(slotId, newStatus, lockedUntil = null) {
    const slots = this.getTable("SLOTS");
    const slot = slots.find(s => s.slot_id === slotId);
    if (slot) {
      slot.status = newStatus;
      slot.locked_until = lockedUntil;
      this.setTable("SLOTS", slots);
      return slot;
    }
    return null;
  }
}

// Auto-initialize local DB schema on script load
LocalDatabase.init();
