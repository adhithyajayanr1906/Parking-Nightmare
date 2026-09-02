"""
Metropolitan Parking System (MPS) - RESTful API Backend Server
Built with Python Flask, SQLite, Dijkstra Routing Engine, and Thread-Safe State Manager.
Academic Project: Sri Eshwar College of Engineering (CSE Dept, IDEATORS / Batch 12)
"""

import os
import uuid
import time
from datetime import datetime, timedelta
from flask import Flask, request, jsonify

from database import init_db, get_db_connection
from dijkstra_engine import build_default_metropolitan_graph, dijkstra_shortest_path, dynamic_reroute
from state_manager import state_manager

app = Flask(__name__)

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response

# Initialize Database & Graph on Startup
init_db()
urban_graph = build_default_metropolitan_graph()

# Initialize State Manager with database slots
def sync_state_manager():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT slot_id, status FROM Slots")
    rows = cursor.fetchall()
    for row in rows:
        state_manager.initialize_slot(row["slot_id"], row["status"])
    conn.close()

sync_state_manager()

# --- HEALTH & METADATA ---
@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ONLINE",
        "system": "Metropolitan Parking System (MPS)",
        "academic_info": {
            "institution": "Sri Eshwar College of Engineering, Coimbatore, Tamil Nadu",
            "department": "Computer Science and Engineering",
            "team_batch": "IDEATORS / Batch 12",
            "mentor": "AdhithyaJayan R",
            "team_members": [
                {"name": "AdhithyaJayan R", "roll_no": "25CS003", "role": "Research & Analysis Lead"},
                {"name": "Akshai T", "roll_no": "25CS006", "role": "Solution & Design Lead"},
                {"name": "Dayanand K", "roll_no": "25CS027", "role": "Technical Lead"}
            ],
            "sdg_alignments": ["SDG 11: Sustainable Cities & Communities", "SDG 12: Responsible Consumption & Production"],
            "budget": "₹2,500 Total"
        },
        "timestamp": datetime.utcnow().isoformat()
    })

# --- AUTHENTICATION ENDPOINTS ---
@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data = request.json or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    requested_role = data.get("role", "DRIVER").upper()

    # Simple Password Verification Matrix
    valid_passwords = {
        "DRIVER": "driver123",
        "OWNER": "owner123",
        "ADMIN": "admin123"
    }

    expected_pwd = valid_passwords.get(requested_role, "123456")
    
    # Check if password matches simple role password or generic '123456'
    if password != expected_pwd and password != "123456":
        return jsonify({"success": False, "error": f"Invalid password for {requested_role}. Demo password is '{expected_pwd}'"}), 401

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM Users WHERE LOWER(email) = ? OR role = ?", (email, requested_role))
    user_row = cursor.fetchone()
    conn.close()

    if user_row:
        user = dict(user_row)
    else:
        # Demo fallback profile
        user = {
            "user_id": f"U-{requested_role}-DEMO",
            "full_name": f"Demo {requested_role.title()} User",
            "email": email or f"{requested_role.lower()}@metropark.org",
            "role": requested_role,
            "verification_status": "VERIFIED"
        }

    return jsonify({
        "success": True,
        "message": f"Login successful as {requested_role}",
        "user": user
    })

@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    data = request.json or {}
    full_name = data.get("full_name", "").strip()
    email = data.get("email", "").strip().lower()
    phone = data.get("phone", "").strip()
    password = data.get("password", "123456")
    role = data.get("role", "DRIVER").upper()

    if not full_name or not email:
        return jsonify({"success": False, "error": "Full Name and Email are required"}), 400

    user_id = f"U-{role}-{uuid.uuid4().hex[:6].upper()}"
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO Users (user_id, full_name, email, phone, role, verification_status, created_at)
            VALUES (?, ?, ?, ?, ?, 'VERIFIED', ?)
        """, (user_id, full_name, email, phone, role, now))

        if role == "DRIVER":
            vehicle_id = f"V-{uuid.uuid4().hex[:6].upper()}"
            vtype = data.get("vehicle_type", "CAR").upper()
            plate = data.get("license_plate", f"TN-37-X-{uuid.uuid4().hex[:4].upper()}")
            model = data.get("vehicle_model", "Standard Vehicle")

            cursor.execute("""
                INSERT INTO Vehicles (vehicle_id, driver_id, vehicle_type, license_plate, vehicle_model, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (vehicle_id, user_id, vtype, plate, model, now))

        elif role == "OWNER":
            title = data.get("title", f"{full_name}'s Parking Bay")
            address = data.get("address", "Coimbatore Main Rd")
            rate = float(data.get("hourly_rate", 35.0))
            capacity = int(data.get("capacity", 2))
            listing_id = f"L-{uuid.uuid4().hex[:6].upper()}"

            cursor.execute("""
                INSERT INTO Listings (listing_id, owner_id, title, address, latitude, longitude, total_capacity, hourly_rate, vehicle_types_allowed, operating_hours, verification_status, created_at)
                VALUES (?, ?, ?, ?, 11.0185, 76.9612, ?, ?, 'CAR,BIKE', '24/7', 'VERIFIED', ?)
            """, (listing_id, user_id, title, address, capacity, rate, now))

            for i in range(1, capacity + 1):
                slot_id = f"S-{listing_id}-{i}"
                cursor.execute("""
                    INSERT INTO Slots (slot_id, listing_id, slot_number, vehicle_type, status, updated_at)
                    VALUES (?, ?, ?, 'CAR', 'AVAILABLE', ?)
                """, (slot_id, listing_id, f"Slot-{i}", now))
                state_manager.initialize_slot(slot_id, "AVAILABLE")

        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "message": f"Registration successful for {full_name} as {role}!",
            "user": {
                "user_id": user_id,
                "full_name": full_name,
                "email": email,
                "role": role,
                "verification_status": "VERIFIED"
            }
        })
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "error": str(e)}), 400

# --- GRAPH & ROUTING ENDPOINTS ---
@app.route("/api/graph", methods=["GET"])
def get_graph():
    return jsonify({
        "nodes": list(urban_graph.nodes.values()),
        "edges": urban_graph.edges
    })

@app.route("/api/driver/route", methods=["POST"])
def compute_route():
    """
    Computes shortest path between origin node S and target parking node D using Dijkstra's algorithm.
    Formula: d(v) = min_{u in N} (d(u) + w(u, v))
    """
    data = request.json or {}
    start_node = data.get("start_node", "N1")
    target_node = data.get("target_node", "P1")

    result = dijkstra_shortest_path(urban_graph, start_node, target_node)
    if "error" in result:
        return jsonify(result), 400

    return jsonify(result)

@app.route("/api/driver/reroute", methods=["POST"])
def compute_reroute():
    """
    Dynamic Rerouting Endpoint: Triggered when target slot becomes unavailable.
    Calculates route to next nearest available parking slot in the urban graph.
    """
    data = request.json or {}
    start_node = data.get("start_node", "N1")
    failed_target_node = data.get("failed_target_node", "P1")

    # Get available parking node IDs from state manager
    all_states = state_manager.get_all_slot_states()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT DISTINCT l.listing_id, s.slot_id 
        FROM Listings l 
        JOIN Slots s ON l.listing_id = s.listing_id
    """)
    slots_db = cursor.fetchall()
    conn.close()

    # Map listing IDs to graph nodes (P1 -> L-101, P2 -> L-102, etc.)
    listing_to_node = {"L-101": "P1", "L-102": "P2", "L-103": "P3", "L-104": "P4", "L-105": "P5"}
    
    available_parking_nodes = set()
    for row in slots_db:
        st = all_states.get(row["slot_id"], {}).get("status", "AVAILABLE")
        if st == "AVAILABLE":
            node_id = listing_to_node.get(row["listing_id"])
            if node_id:
                available_parking_nodes.add(node_id)

    reroute_res = dynamic_reroute(urban_graph, start_node, failed_target_node, list(available_parking_nodes))
    if "error" in reroute_res:
        return jsonify(reroute_res), 400

    return jsonify(reroute_res)

# --- DRIVER MODULE ENDPOINTS ---
@app.route("/api/driver/search", methods=["GET"])
def search_parking_slots():
    vehicle_type = request.args.get("vehicle_type", "CAR").upper()
    max_rate = float(request.args.get("max_rate", 100))

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT l.listing_id, l.title, l.address, l.latitude, l.longitude, l.hourly_rate, l.operating_hours,
               s.slot_id, s.slot_number, s.status, s.vehicle_type
        FROM Listings l
        JOIN Slots s ON l.listing_id = s.listing_id
        WHERE l.verification_status = 'VERIFIED'
          AND s.vehicle_type = ?
          AND l.hourly_rate <= ?
    """, (vehicle_type, max_rate))

    rows = cursor.fetchall()
    conn.close()

    # Dynamic status sync from state_manager
    all_states = state_manager.get_all_slot_states()
    results = []
    for r in rows:
        dict_r = dict(r)
        current_status = all_states.get(r["slot_id"], {}).get("status", r["status"])
        dict_r["status"] = current_status
        results.append(dict_r)

    return jsonify({"slots": results})

@app.route("/api/driver/book", methods=["POST"])
def create_booking():
    """
    Reserves slot with atomic locking, transitions status AVAILABLE -> RESERVED,
    generates mock digital receipt.
    """
    data = request.json or {}
    driver_id = data.get("driver_id", "U-DRIVER-1")
    slot_id = data.get("slot_id")
    vehicle_id = data.get("vehicle_id", "V-CAR-1")
    duration_hours = int(data.get("duration_hours", 2))

    if not slot_id:
        return jsonify({"error": "Slot ID is required"}), 400

    booking_id = f"B-{uuid.uuid4().hex[:8].upper()}"

    # Atomic Reservation Execution
    res = state_manager.reserve_slot_atomic(slot_id, driver_id, booking_id)
    if not res.get("success"):
        return jsonify(res), 409

    # DB Persistence
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT hourly_rate FROM Listings WHERE listing_id = (SELECT listing_id FROM Slots WHERE slot_id = ?)", (slot_id,))
    rate_row = cursor.fetchone()
    hourly_rate = rate_row["hourly_rate"] if rate_row else 40.0

    total_amount = hourly_rate * duration_hours
    platform_commission = round(total_amount * 0.10, 2) # 10% platform fee
    owner_payout = round(total_amount - platform_commission, 2)
    now = datetime.utcnow()
    end_time = now + timedelta(hours=duration_hours)

    cursor.execute("""
        INSERT INTO Bookings (booking_id, driver_id, slot_id, vehicle_id, start_time, end_time, total_amount, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'RESERVED', ?)
    """, (booking_id, driver_id, slot_id, vehicle_id, now.strftime("%Y-%m-%d %H:%M:%S"), end_time.strftime("%Y-%m-%d %H:%M:%S"), total_amount, now.strftime("%Y-%m-%d %H:%M:%S")))

    # Record Transaction
    tx_id = f"TX-{uuid.uuid4().hex[:8].upper()}"
    cursor.execute("""
        INSERT INTO Transactions (transaction_id, booking_id, user_id, amount, platform_commission, owner_payout, payment_type, payment_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'BOOKING_FEE', 'COMPLETED', ?)
    """, (tx_id, booking_id, driver_id, total_amount, platform_commission, owner_payout, now.strftime("%Y-%m-%d %H:%M:%S")))

    # Update slot status in DB
    cursor.execute("UPDATE Slots SET status = 'RESERVED', locked_until = ? WHERE slot_id = ?", (res["locked_until"], slot_id))

    # Audit log
    cursor.execute("""
        INSERT INTO SystemLogs (log_id, timestamp, log_level, module, action, details, user_id)
        VALUES (?, ?, 'AUDIT', 'BOOKING_ENGINE', 'RESERVATION_CREATED', ?, ?)
    """, (f"LOG-{uuid.uuid4().hex[:6].upper()}", now.strftime("%Y-%m-%d %H:%M:%S"), f"Slot {slot_id} reserved under booking {booking_id}", driver_id))

    conn.commit()
    conn.close()

    # Digital Receipt Output
    receipt = {
        "booking_id": booking_id,
        "transaction_id": tx_id,
        "slot_id": slot_id,
        "driver_id": driver_id,
        "duration_hours": duration_hours,
        "total_amount_inr": total_amount,
        "platform_fee_inr": platform_commission,
        "owner_earnings_inr": owner_payout,
        "status": "RESERVED",
        "reserved_until": res["locked_until"],
        "timeout_notice": "Slot lock expires in 15 minutes if check-in is not confirmed."
    }

    return jsonify({"success": True, "booking": receipt})

@app.route("/api/driver/checkin", methods=["POST"])
def checkin_slot():
    data = request.json or {}
    slot_id = data.get("slot_id")
    driver_id = data.get("driver_id", "U-DRIVER-1")

    res = state_manager.checkin_slot(slot_id, driver_id)
    if not res.get("success"):
        return jsonify(res), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE Slots SET status = 'OCCUPIED', locked_until = NULL WHERE slot_id = ?", (slot_id,))
    cursor.execute("UPDATE Bookings SET status = 'ACTIVE' WHERE slot_id = ? AND status = 'RESERVED'", (slot_id,))
    conn.commit()
    conn.close()

    return jsonify(res)

@app.route("/api/driver/checkout", methods=["POST"])
def checkout_slot():
    data = request.json or {}
    slot_id = data.get("slot_id")

    res = state_manager.checkout_slot(slot_id)
    if not res.get("success"):
        return jsonify(res), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE Slots SET status = 'AVAILABLE' WHERE slot_id = ?", (slot_id,))
    cursor.execute("UPDATE Bookings SET status = 'COMPLETED' WHERE slot_id = ? AND status = 'ACTIVE'", (slot_id,))
    conn.commit()
    conn.close()

    return jsonify(res)

# --- OWNER MODULE ENDPOINTS ---
@app.route("/api/owner/listings", methods=["GET", "POST"])
def manage_listings():
    if request.method == "POST":
        data = request.json or {}
        owner_id = data.get("owner_id", "U-OWNER-1")
        title = data.get("title", "New Private Driveway")
        address = data.get("address", "10 City Center Rd")
        lat = float(data.get("latitude", 11.0180))
        lng = float(data.get("longitude", 76.9600))
        capacity = int(data.get("capacity", 2))
        rate = float(data.get("hourly_rate", 35.0))
        allowed = data.get("vehicle_types_allowed", "CAR,BIKE")
        hours = data.get("operating_hours", "24/7")

        listing_id = f"L-{uuid.uuid4().hex[:6].upper()}"
        now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO Listings (listing_id, owner_id, title, address, latitude, longitude, total_capacity, hourly_rate, vehicle_types_allowed, operating_hours, verification_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
        """, (listing_id, owner_id, title, address, lat, lng, capacity, rate, allowed, hours, now))

        # Auto-create slots for listing
        for i in range(1, capacity + 1):
            slot_id = f"S-{listing_id}-{i}"
            vtype = "CAR" if (i % 2 != 0) else "BIKE"
            cursor.execute("""
                INSERT INTO Slots (slot_id, listing_id, slot_number, vehicle_type, status, updated_at)
                VALUES (?, ?, ?, ?, 'AVAILABLE', ?)
            """, (slot_id, listing_id, f"Slot-{i}", vtype, now))
            state_manager.initialize_slot(slot_id, "AVAILABLE")

        conn.commit()
        conn.close()

        return jsonify({"success": True, "listing_id": listing_id, "message": "Listing submitted and pending Admin verification."})

    else:
        owner_id = request.args.get("owner_id", "U-OWNER-1")
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM Listings WHERE owner_id = ?", (owner_id,))
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return jsonify({"listings": rows})

@app.route("/api/owner/slots", methods=["GET"])
def get_owner_live_slots():
    owner_id = request.args.get("owner_id", "U-OWNER-1")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT s.slot_id, s.listing_id, s.slot_number, s.vehicle_type, s.status, l.title
        FROM Slots s
        JOIN Listings l ON s.listing_id = l.listing_id
        WHERE l.owner_id = ?
    """, (owner_id,))
    rows = cursor.fetchall()
    conn.close()

    all_states = state_manager.get_all_slot_states()
    slots = []
    for r in rows:
        d = dict(r)
        d["status"] = all_states.get(r["slot_id"], {}).get("status", r["status"])
        slots.append(d)

    return jsonify({"slots": slots})

@app.route("/api/owner/payout", methods=["GET", "POST"])
def owner_payout_ledger():
    owner_id = request.args.get("owner_id") or request.json.get("owner_id", "U-OWNER-1") if request.json else "U-OWNER-1"
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if request.method == "POST":
        data = request.json or {}
        withdraw_amount = float(data.get("amount", 100.0))
        tx_id = f"WD-{uuid.uuid4().hex[:8].upper()}"
        now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute("""
            INSERT INTO Transactions (transaction_id, user_id, amount, payment_type, payment_status, created_at)
            VALUES (?, ?, ?, 'OWNER_WITHDRAWAL', 'COMPLETED', ?)
        """, (tx_id, owner_id, withdraw_amount, now))

        conn.commit()
        conn.close()
        return jsonify({"success": True, "withdrawal_id": tx_id, "amount_inr": withdraw_amount})

    # GET Request: Summary ledger
    cursor.execute("""
        SELECT SUM(t.owner_payout) as total_earnings
        FROM Transactions t
        JOIN Bookings b ON t.booking_id = b.booking_id
        JOIN Slots s ON b.slot_id = s.slot_id
        JOIN Listings l ON s.listing_id = l.listing_id
        WHERE l.owner_id = ? AND t.payment_type = 'BOOKING_FEE'
    """, (owner_id,))
    row = cursor.fetchone()
    total_earned = row["total_earnings"] or 0.0

    cursor.execute("""
        SELECT SUM(amount) as total_withdrawn
        FROM Transactions
        WHERE user_id = ? AND payment_type = 'OWNER_WITHDRAWAL'
    """, (owner_id,))
    w_row = cursor.fetchone()
    total_withdrawn = w_row["total_withdrawn"] or 0.0

    balance = total_earned - total_withdrawn
    conn.close()

    return jsonify({
        "owner_id": owner_id,
        "total_earned_inr": round(total_earned, 2),
        "total_withdrawn_inr": round(total_withdrawn, 2),
        "available_payout_balance_inr": round(balance, 2)
    })

# --- ADMIN MODULE ENDPOINTS ---
@app.route("/api/admin/metrics", methods=["GET"])
def get_admin_metrics():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM Users WHERE role = 'DRIVER'")
    total_drivers = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM Users WHERE role = 'OWNER'")
    total_owners = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM Slots")
    total_spaces = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM Bookings WHERE status IN ('RESERVED', 'ACTIVE')")
    active_bookings = cursor.fetchone()[0]

    cursor.execute("SELECT SUM(amount), SUM(platform_commission), SUM(owner_payout) FROM Transactions WHERE payment_type = 'BOOKING_FEE'")
    rev_row = cursor.fetchone()
    total_revenue = rev_row[0] or 0.0
    platform_fee = rev_row[1] or 0.0
    owner_payouts = rev_row[2] or 0.0

    conn.close()

    # Carbon Offset KPI (Approx 0.42 kg CO2 saved per booking by avoiding traffic cruising)
    total_carbon_offset_kg = round(active_bookings * 0.42 + 14.5, 2)

    return jsonify({
        "total_drivers": total_drivers,
        "total_owners": total_owners,
        "total_parking_spaces": total_spaces,
        "active_bookings": active_bookings,
        "financials": {
            "total_gross_revenue_inr": round(total_revenue, 2),
            "platform_commission_inr": round(platform_fee, 2),
            "owner_payouts_inr": round(owner_payouts, 2)
        },
        "environmental_impact": {
            "carbon_offset_kg_co2": total_carbon_offset_kg,
            "sdg_target": "SDG 11 & SDG 12 Urban Emissions Reduction"
        }
    })

@app.route("/api/admin/verification", methods=["GET"])
def get_verification_queue():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM Listings WHERE verification_status = 'PENDING'")
    pending_listings = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM Users WHERE verification_status = 'PENDING'")
    pending_users = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return jsonify({
        "pending_listings": pending_listings,
        "pending_users": pending_users
    })

@app.route("/api/admin/approve", methods=["POST"])
def approve_entity():
    data = request.json or {}
    entity_type = data.get("entity_type") # "LISTING" or "USER"
    entity_id = data.get("entity_id")

    conn = get_db_connection()
    cursor = conn.cursor()
    if entity_type == "LISTING":
        cursor.execute("UPDATE Listings SET verification_status = 'VERIFIED' WHERE listing_id = ?", (entity_id,))
    elif entity_type == "USER":
        cursor.execute("UPDATE Users SET verification_status = 'VERIFIED' WHERE user_id = ?", (entity_id,))
    
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": f"{entity_type} '{entity_id}' verified successfully."})

@app.route("/api/admin/override", methods=["POST"])
def admin_override():
    data = request.json or {}
    action_type = data.get("action") # "FORCE_RELEASE" or "RESOLVE_DISPUTE"
    slot_id = data.get("slot_id")

    if action_type == "FORCE_RELEASE":
        res = state_manager.force_release_slot(slot_id, admin_reason="Admin Manual Lock Release")
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE Slots SET status = 'AVAILABLE', locked_until = NULL WHERE slot_id = ?", (slot_id,))
        conn.commit()
        conn.close()
        return jsonify(res)

    elif action_type == "RESOLVE_DISPUTE":
        ticket_id = data.get("ticket_id")
        resolution = data.get("resolution", "Refund issued to driver")
        res = state_manager.resolve_dispute_ticket(ticket_id, resolution)
        return jsonify(res)

    return jsonify({"error": "Invalid action type"}), 400

@app.route("/api/admin/logs", methods=["GET"])
def get_system_logs():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM SystemLogs ORDER BY timestamp DESC LIMIT 50")
    logs = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({"logs": logs})


@app.route("/api/ai/query", methods=["POST"])
def ai_query_assistant():
    data = request.json or {}
    query = data.get("query", "").strip()
    role = data.get("role", "DRIVER").upper()

    if not query:
        return jsonify({"success": False, "error": "Query parameter cannot be empty"}), 400

    q = query.lower()
    answer = ""

    if "15" in q or "lock" in q or "reserve" in q or "hold" in q or "timeout" in q:
        answer = "🔒 **15-Minute Atomic Slot Lock Mechanism**\n\nWhen a driver reserves a parking spot:\n1. The slot state transitions atomically from `AVAILABLE` -> `RESERVED`.\n2. A 15-minute countdown worker thread locks the slot specifically for your vehicle plate.\n3. If you confirm arrival within 15 minutes, state becomes `OCCUPIED`.\n4. If 15 minutes elapse without check-in, the system automatically releases the lock back to `AVAILABLE` to prevent slot hoarding!"
    elif "dijkstra" in q or "route" in q or "map" in q or "algorithm" in q or "path" in q or "osrm" in q:
        answer = "🗺️ **Dijkstra Graph & OSRM Real Road Engine**\n\n- **Formula**: d(v) = min_{u}(d(u) + w(u, v))\n- Edge weights w(u, v) account for street distance, speed limit (km/h), and live traffic factors.\n- **OSRM Integration**: Queries real street coordinates so polyline navigation strictly bends along actual roads (Cross Cut Rd, 100 Feet Rd, Avinashi Rd) rather than drawing straight lines!"
    elif "co2" in q or "carbon" in q or "environment" in q or "sdg" in q or "green" in q:
        answer = "🌱 **CO₂ Offset & UN SDG Alignment**\n\n- **Formula**: Saved CO₂ = Cruising Distance Eliminated (km) * 0.12 kg CO₂/km\n- Cruising around searching for parking causes ~30% of urban congestion.\n- Direct graph routing saves up to **0.42 kg CO₂ per trip**, supporting **UN SDG 11** (Sustainable Cities) & **SDG 12** (Responsible Resource Consumption)."
    elif "taken" in q or "conflict" in q or "full" in q or "occupied" in q or "reroute" in q:
        answer = "🔄 **Smart Dynamic Rerouting**\n\nIf your reserved slot is taken or occupied while you are in transit:\n1. The system detects the occupancy change in real-time.\n2. The **Dynamic Rerouting Engine** queries remaining candidate spots.\n3. Navigation instantly recalculates the shortest road path to the next nearest available space without requiring manual re-searches!"
    elif "payout" in q or "earning" in q or "money" in q or "withdraw" in q or "split" in q or "commission" in q or "percent" in q:
        answer = "💰 **Financial Revenue Split & IMPS Bank Payouts**\n\n- **Space Owner Payout**: Property owners receive **90%** of total gross rental fees.\n- **Platform Fee**: MetroPark retains **10%** commission for infrastructure & routing.\n- **Withdrawal**: Space owners can click **'💸 Withdraw Earnings'** anytime to initiate instant IMPS bank transfers directly to their registered bank account."
    elif "list" in q or "garage" in q or "driveway" in q or "add space" in q or "property" in q:
        answer = "➕ **Listing Your Private Parking Space**\n\n1. Log in as a **Space Owner**.\n2. Click **'➕ List New Parking Space'** on your dashboard.\n3. Enter property title, address, hourly rate (e.g. ₹35/hr), and slot capacity.\n4. Once submitted, your listing is placed in the Admin Verification Queue and will go live immediately upon verification!"
    elif "admin" in q or "override" in q or "force" in q or "release" in q or "verify" in q:
        answer = "🛡️ **Admin Supervision & System Overrides**\n\n- **Force Release**: Admins can enter any Slot ID (e.g., `S-101-B`) and click **'🔓 Force Release Lock'** to override stuck states.\n- **Verification Queue**: Review and approve newly registered property owners or drivers with 1-click.\n- **Financial Oversight**: Track total gross bookings, 10% platform commission, and 90% owner payouts."
    else:
        answer = f"🤖 **MetroAI Mobility Knowledge Response**\n\nThank you for asking! In MetroPark, your active context is **{role}**.\n\n- **Core Operations**: OSRM real road navigation, 15-minute atomic slot locks, 90/10 financial revenue split, and real-time admin supervision.\n\nFeel free to ask specific questions about slot reservations, routing algorithms, earnings withdrawal, or account settings!"

    return jsonify({
        "success": True,
        "query": query,
        "role": role,
        "answer": answer
    })


if __name__ == "__main__":
    print("======================================================================")
    print(" METROPOLITAN PARKING SYSTEM (MPS) - FLASK SERVER RUNNING ON PORT 5000")
    print(" Academic Project: Sri Eshwar College of Engineering (IDEATORS / Batch 12)")
    print("======================================================================")
    app.run(host="0.0.0.0", port=5000, debug=True)
