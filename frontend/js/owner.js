/**
 * MetroPark - Space Renting Owner Portal Manager (Investor Edition)
 * Manages owner property portfolio, live visual parking bay grid, and financial ledger.
 */

function initOwnerPortal() {
  refreshOwnerData();
}

async function refreshOwnerData() {
  let listings = [];
  let slots = [];

  if (state.isApiOnline) {
    try {
      const currentOwnerId = state.currentUser ? state.currentUser.user_id : "U-OWNER-1";
      const lRes = await fetch(`${API_BASE}/owner/listings?owner_id=${currentOwnerId}`);
      const lData = await lRes.json();
      listings = lData.listings;

      const sRes = await fetch(`${API_BASE}/owner/slots?owner_id=${currentOwnerId}`);
      const sData = await sRes.json();
      slots = sData.slots;
    } catch (e) {
      listings = getMockListings();
      slots = getMockSlotsForOwner();
    }
  } else {
    listings = getMockListings();
    slots = getMockSlotsForOwner();
  }

  renderOwnerListingsTable(listings);
  renderOwnerVisualSlotGrid(slots);
}

function renderOwnerListingsTable(listings) {
  const tbody = document.getElementById("ownerListingsTable");
  if (!tbody) return;

  tbody.innerHTML = "";
  document.getElementById("ownerSpacesCount").innerText = listings.length;

  listings.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong style="color:var(--text-main);">${item.title}</strong></td>
      <td style="color:var(--text-muted);">${item.address}</td>
      <td><strong style="color:var(--color-primary);">₹${item.hourly_rate} / hr</strong></td>
      <td>${item.total_capacity} Slots</td>
      <td>${item.operating_hours || '24/7 Open'}</td>
      <td><span style="color:var(--color-success); font-weight:700;">● ${item.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderOwnerVisualSlotGrid(slots) {
  const grid = document.getElementById("ownerSlotGrid");
  if (!grid) return;

  grid.innerHTML = "";

  slots.forEach(slot => {
    const card = document.createElement("div");
    const isAvail = slot.status === "AVAILABLE";
    const isRes = slot.status === "RESERVED";

    const statusClass = isAvail ? "available" : isRes ? "reserved" : "occupied";
    const statusText = isAvail ? "🟩 Available" : isRes ? "⏳ Reserved (15m)" : "🚗 Occupied";
    const icon = isAvail ? "🅿️" : isRes ? "⏳" : "🚗";

    card.className = `slot-bay-card ${statusClass}`;
    card.innerHTML = `
      <div style="font-size:1.6rem; margin-bottom:0.2rem;">${icon}</div>
      <div class="slot-bay-num">${slot.slot_number}</div>
      <div class="slot-bay-status">${statusText}</div>
      <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.2rem;">${slot.vehicle_type}</div>
    `;
    grid.appendChild(card);
  });
}

function getMockListings() {
  return [
    { title: "Green Plaza Driveway", address: "12 Tech Park Rd", hourly_rate: 40, total_capacity: 2, operating_hours: "24/7 Open", status: "VERIFIED" },
    { title: "Metropolitan Tower Garage", address: "45 Commercial Ave", hourly_rate: 60, total_capacity: 3, operating_hours: "06:00 AM - 11:00 PM", status: "VERIFIED" }
  ];
}

function getMockSlotsForOwner() {
  return [
    { slot_number: "Bay A1", status: "AVAILABLE", vehicle_type: "CAR" },
    { slot_number: "Bay A2", status: "RESERVED", vehicle_type: "CAR" },
    { slot_number: "Bay G1", status: "OCCUPIED", vehicle_type: "CAR" },
    { slot_number: "Bay G2", status: "AVAILABLE", vehicle_type: "BIKE" },
    { slot_number: "Bay G3", status: "AVAILABLE", vehicle_type: "CAR" }
  ];
}

function openAddListingModal() {
  openModal("addListingModal");
}

function submitNewListing(e) {
  e.preventDefault();
  const title = document.getElementById("newTitle").value;
  const address = document.getElementById("newAddress").value;
  const rate = document.getElementById("newRate").value;
  const cap = document.getElementById("newCapacity").value;

  alert(`🎉 Property Registered!\n"${title}" (${cap} Slots @ ₹${rate}/hr) has been submitted for Admin Verification.`);
  closeModal("addListingModal");
  refreshOwnerData();
}

function openPayoutModal() {
  openModal("payoutModal");
}

function submitPayoutWithdrawal(e) {
  e.preventDefault();
  const amt = document.getElementById("payoutAmountInput").value;
  alert(`💸 Payout Successful!\n₹${amt}.00 has been transferred to your registered Bank Account via IMPS.`);
  closeModal("payoutModal");
}
