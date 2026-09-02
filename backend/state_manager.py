"""
Metropolitan Parking System (MPS) - Thread-Safe State Machine & Reservation Worker
Enforces slot lifecycle: AVAILABLE -> RESERVED -> OCCUPIED -> AVAILABLE
Includes atomic locking via Python threading.Lock to prevent double-booking race conditions,
and a 15-minute automated background countdown timer to auto-release expired reservations.
"""

import threading
import time
from datetime import datetime, timedelta

class SlotStateManager:
    def __init__(self, reservation_timeout_seconds=900): # Default 15 minutes = 900s
        self.reservation_timeout_seconds = reservation_timeout_seconds
        
        # Thread lock for atomic state transitions & lock prevention
        self._lock = threading.Lock()
        
        # In-memory dictionary tracking slot states and locks:
        # slot_id -> {"status": "AVAILABLE"|"RESERVED"|"OCCUPIED", "reserved_at": timestamp, "reserved_by": driver_id, "locked_until": timestamp}
        self.slots_state = {}
        
        # Active bookings dictionary: booking_id -> dict
        self.active_bookings = {}
        
        # Dispute tickets: ticket_id -> dict
        self.dispute_tickets = []
        
        # Start background timer daemon thread
        self.running = True
        self.worker_thread = threading.Thread(target=self._reservation_timer_worker, daemon=True)
        self.worker_thread.start()

    def initialize_slot(self, slot_id, initial_status="AVAILABLE"):
        with self._lock:
            if slot_id not in self.slots_state:
                self.slots_state[slot_id] = {
                    "status": initial_status,
                    "reserved_at": None,
                    "reserved_by": None,
                    "locked_until": None,
                    "booking_id": None
                }

    def reserve_slot_atomic(self, slot_id, driver_id, booking_id):
        """
        Atomic Non-Blocking Slot Reservation.
        Prevents double-booking race conditions by acquiring a thread lock.
        Transition: AVAILABLE -> RESERVED
        """
        with self._lock:
            slot = self.slots_state.get(slot_id)
            if not slot:
                # Default init if missing
                slot = {
                    "status": "AVAILABLE",
                    "reserved_at": None,
                    "reserved_by": None,
                    "locked_until": None,
                    "booking_id": None
                }
                self.slots_state[slot_id] = slot

            if slot["status"] != "AVAILABLE":
                return {
                    "success": False,
                    "error": f"Slot '{slot_id}' is currently in '{slot['status']}' state and cannot be reserved."
                }

            now = datetime.utcnow()
            locked_until = now + timedelta(seconds=self.reservation_timeout_seconds)

            slot["status"] = "RESERVED"
            slot["reserved_at"] = now.isoformat()
            slot["reserved_by"] = driver_id
            slot["locked_until"] = locked_until.isoformat()
            slot["booking_id"] = booking_id

            self.active_bookings[booking_id] = {
                "booking_id": booking_id,
                "slot_id": slot_id,
                "driver_id": driver_id,
                "status": "RESERVED",
                "reserved_at": now.isoformat(),
                "expires_at": locked_until.isoformat()
            }

            return {
                "success": True,
                "slot_id": slot_id,
                "status": "RESERVED",
                "locked_until": locked_until.isoformat(),
                "timeout_minutes": self.reservation_timeout_seconds // 60
            }

    def checkin_slot(self, slot_id, driver_id):
        """
        Driver check-in transition: RESERVED -> OCCUPIED
        """
        with self._lock:
            slot = self.slots_state.get(slot_id)
            if not slot:
                return {"success": False, "error": f"Slot '{slot_id}' not found."}

            if slot["status"] != "RESERVED":
                return {"success": False, "error": f"Cannot check-in. Slot status is '{slot['status']}', expected 'RESERVED'."}

            if slot["reserved_by"] != driver_id:
                return {"success": False, "error": "Driver ID mismatch for this reservation."}

            slot["status"] = "OCCUPIED"
            slot["locked_until"] = None

            booking_id = slot.get("booking_id")
            if booking_id and booking_id in self.active_bookings:
                self.active_bookings[booking_id]["status"] = "ACTIVE"

            return {"success": True, "slot_id": slot_id, "status": "OCCUPIED"}

    def checkout_slot(self, slot_id):
        """
        Driver check-out transition: OCCUPIED -> AVAILABLE
        """
        with self._lock:
            slot = self.slots_state.get(slot_id)
            if not slot:
                return {"success": False, "error": f"Slot '{slot_id}' not found."}

            if slot["status"] != "OCCUPIED":
                return {"success": False, "error": f"Cannot checkout. Slot status is '{slot['status']}', expected 'OCCUPIED'."}

            booking_id = slot.get("booking_id")
            if booking_id and booking_id in self.active_bookings:
                self.active_bookings[booking_id]["status"] = "COMPLETED"

            slot["status"] = "AVAILABLE"
            slot["reserved_at"] = None
            slot["reserved_by"] = None
            slot["locked_until"] = None
            slot["booking_id"] = None

            return {"success": True, "slot_id": slot_id, "status": "AVAILABLE"}

    def force_release_slot(self, slot_id, admin_reason="Admin Override"):
        """
        Admin Override: Force releases stuck slot locks back to AVAILABLE.
        """
        with self._lock:
            slot = self.slots_state.get(slot_id)
            if not slot:
                return {"success": False, "error": "Slot not found"}

            previous_status = slot["status"]
            booking_id = slot.get("booking_id")

            slot["status"] = "AVAILABLE"
            slot["reserved_at"] = None
            slot["reserved_by"] = None
            slot["locked_until"] = None
            slot["booking_id"] = None

            if booking_id and booking_id in self.active_bookings:
                self.active_bookings[booking_id]["status"] = "EXPIRED"

            return {
                "success": True,
                "slot_id": slot_id,
                "previous_status": previous_status,
                "status": "AVAILABLE",
                "reason": admin_reason
            }

    def create_dispute_ticket(self, booking_id, driver_id, owner_id, issue_type, description):
        with self._lock:
            ticket = {
                "ticket_id": f"TKT-{int(time.time())}",
                "booking_id": booking_id,
                "driver_id": driver_id,
                "owner_id": owner_id,
                "issue_type": issue_type,
                "description": description,
                "status": "OPEN",
                "created_at": datetime.utcnow().isoformat()
            }
            self.dispute_tickets.append(ticket)
            return ticket

    def resolve_dispute_ticket(self, ticket_id, resolution):
        with self._lock:
            for ticket in self.dispute_tickets:
                if ticket["ticket_id"] == ticket_id:
                    ticket["status"] = "RESOLVED"
                    ticket["resolution"] = resolution
                    ticket["resolved_at"] = datetime.utcnow().isoformat()
                    return {"success": True, "ticket": ticket}
            return {"success": False, "error": "Ticket not found"}

    def get_all_slot_states(self):
        with self._lock:
            return dict(self.slots_state)

    def _reservation_timer_worker(self):
        """
        Background Daemon Thread: Periodically checks for expired RESERVED slots
        and releases them back to AVAILABLE if countdown timer (15 mins) has elapsed.
        """
        while self.running:
            time.sleep(2)  # Check every 2 seconds
            with self._lock:
                now = datetime.utcnow()
                for slot_id, slot in list(self.slots_state.items()):
                    if slot["status"] == "RESERVED" and slot["locked_until"]:
                        try:
                            expiry = datetime.fromisoformat(slot["locked_until"])
                            if now >= expiry:
                                # Timer expired! Auto-release back to AVAILABLE
                                slot["status"] = "AVAILABLE"
                                slot["reserved_at"] = None
                                slot["reserved_by"] = None
                                slot["locked_until"] = None
                                booking_id = slot.get("booking_id")
                                slot["booking_id"] = None

                                if booking_id and booking_id in self.active_bookings:
                                    self.active_bookings[booking_id]["status"] = "EXPIRED"

                                print(f"[TIMER WORKER] Reservation timeout reached for Slot {slot_id}. Released back to AVAILABLE.")
                        except Exception as e:
                            print(f"[TIMER WORKER ERROR] {e}")


# Global Singleton Instance
state_manager = SlotStateManager(reservation_timeout_seconds=900)
