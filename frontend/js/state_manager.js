/**
 * MetroPark - Client-Side Slot State Manager & 15-Minute Countdown Worker
 * Manages atomic slot state lifecycle (AVAILABLE -> RESERVED -> OCCUPIED -> AVAILABLE)
 * and runs a background countdown daemon loop inside the browser.
 */

class ClientStateManager {
  constructor() {
    this.countdownInterval = null;
    this.startDaemon();
  }

  // Background Daemon Worker (evaluates 15-minute timeout locks every 3 seconds)
  startDaemon() {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    
    this.countdownInterval = setInterval(() => {
      this.checkExpiredReservations();
    }, 3000);
  }

  // Evaluate expired slot locks
  checkExpiredReservations() {
    const slots = LocalDatabase.getTable("SLOTS");
    const now = Date.now();
    let updated = false;

    slots.forEach(slot => {
      if (slot.status === "RESERVED" && slot.locked_until) {
        const lockTime = new Date(slot.locked_until).getTime();
        if (now > lockTime) {
          slot.status = "AVAILABLE";
          slot.locked_until = null;
          updated = true;
          LocalDatabase.addLog(`TIMER_WORKER: Slot ${slot.slot_id} lock expired (15m elapsed). Auto-released to AVAILABLE.`);
        }
      }
    });

    if (updated) {
      LocalDatabase.setTable("SLOTS", slots);
      // Trigger UI updates if function exists
      if (typeof refreshOwnerData === 'function') refreshOwnerData();
    }
  }

  // Reserve a slot with 15-minute lock
  reserveSlot(slotId, driverId) {
    const slots = LocalDatabase.getTable("SLOTS");
    const slot = slots.find(s => s.slot_id === slotId);

    if (!slot) return { success: false, error: "Slot not found" };
    if (slot.status !== "AVAILABLE") return { success: false, error: `Slot ${slotId} is already ${slot.status}` };

    const lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    slot.status = "RESERVED";
    slot.locked_until = lockUntil;
    LocalDatabase.setTable("SLOTS", slots);

    // Create booking record
    const bookings = LocalDatabase.getTable("BOOKINGS");
    const bookingId = `B-${Math.floor(100 + Math.random() * 900)}`;
    const newBooking = {
      booking_id: bookingId,
      driver_id: driverId,
      slot_id: slotId,
      total_fee: slot.hourly_rate,
      status: "RESERVED",
      created_at: new Date().toLocaleString()
    };
    bookings.unshift(newBooking);
    LocalDatabase.setTable("BOOKINGS", bookings);

    // Record Transaction (90% Owner / 10% Platform)
    const txns = LocalDatabase.getTable("TRANSACTIONS");
    const gross = slot.hourly_rate;
    const platform = parseFloat((gross * 0.10).toFixed(2));
    const owner = parseFloat((gross * 0.90).toFixed(2));
    txns.unshift({
      txn_id: `TXN-${Math.floor(100 + Math.random() * 900)}`,
      booking_id: bookingId,
      gross_amount: gross,
      platform_fee: platform,
      owner_payout: owner,
      status: "SUCCESS"
    });
    LocalDatabase.setTable("TRANSACTIONS", txns);

    LocalDatabase.addLog(`SLOT_LOCK: Slot ${slotId} reserved by ${driverId}. 15-min countdown timer active.`);

    return {
      success: true,
      booking: newBooking,
      slot: slot
    };
  }

  // Confirm arrival & check-in
  confirmCheckin(slotId) {
    const slots = LocalDatabase.getTable("SLOTS");
    const slot = slots.find(s => s.slot_id === slotId);

    if (!slot) return { success: false, error: "Slot not found" };

    slot.status = "OCCUPIED";
    slot.locked_until = null;
    LocalDatabase.setTable("SLOTS", slots);

    LocalDatabase.addLog(`CHECKIN_CONFIRMED: Driver confirmed arrival for slot ${slotId}. Status: OCCUPIED.`);

    return { success: true, slot };
  }

  // Admin Force Release Lock
  forceReleaseSlot(slotId) {
    const slots = LocalDatabase.getTable("SLOTS");
    const slot = slots.find(s => s.slot_id === slotId);

    if (!slot) return { success: false, error: "Slot not found" };

    slot.status = "AVAILABLE";
    slot.locked_until = null;
    LocalDatabase.setTable("SLOTS", slots);

    LocalDatabase.addLog(`ADMIN_OVERRIDE: Slot ${slotId} force released back to AVAILABLE by Admin.`);

    return { success: true, slot };
  }
}

// Global Client State Manager Instance
const stateManager = new ClientStateManager();
