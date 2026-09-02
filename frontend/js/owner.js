/**
 * MetroPark - Space Renting Owner Portal Manager (100% Client-Side Architecture)
 * Manages owner property portfolio, live visual parking bay grid, and financial ledger.
 */

function initOwnerPortal() {
  refreshOwnerData();
}

function refreshOwnerData() {
  const currentOwnerId = state.currentUser ? state.currentUser.user_id : "U-OWNER-1";
  
  const allListings = LocalDatabase.getTable("LISTINGS");
  const allSlots = LocalDatabase.getTable("SLOTS");

  const ownerListings = allListings.filter(l => l.owner_id === currentOwnerId || currentOwnerId === "U-OWNER-1");
  const ownerSlots = allSlots.filter(s => ownerListings.some(l => l.property_id === s.property_id) || currentOwnerId === "U-OWNER-1");

  renderOwnerListingsTable(ownerListings);
  renderOwnerVisualSlotGrid(ownerSlots);
}

function renderOwnerListingsTable(listings) {
  const tbody = document.getElementById("ownerListingsTable");
  if (!tbody) return;

  tbody.innerHTML = "";
  const countBadge = document.getElementById("ownerSpacesCount");
  if (countBadge) countBadge.innerText = listings.length;

  listings.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong style="color:var(--text-main);">${item.title}</strong></td>
      <td style="color:var(--text-muted);">${item.address}</td>
      <td><strong style="color:var(--color-primary);">₹${item.hourly_rate} / hr</strong></td>
      <td>${item.capacity} Slots</td>
      <td>24/7 Open</td>
      <td><span style="color:var(--color-success); font-weight:700;">● ${item.verification_status || 'VERIFIED'}</span></td>
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
      <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.2rem;">${slot.vehicle_category || 'CAR'}</div>
    `;
    grid.appendChild(card);
  });
}

function openAddListingModal() {
  openModal("addListingModal");
}

function submitNewListing(e) {
  e.preventDefault();
  const title = document.getElementById("newTitle").value;
  const address = document.getElementById("newAddress").value;
  const rate = parseFloat(document.getElementById("newRate").value) || 40;
  const cap = parseInt(document.getElementById("newCapacity").value) || 2;
  const currentOwnerId = state.currentUser ? state.currentUser.user_id : "U-OWNER-1";

  const listings = LocalDatabase.getTable("LISTINGS");
  const propertyId = `P-${Math.floor(100 + Math.random() * 900)}`;

  const newProp = {
    property_id: propertyId,
    owner_id: currentOwnerId,
    title: title,
    address: address,
    hourly_rate: rate,
    capacity: cap,
    verification_status: "VERIFIED",
    lat: 11.0180,
    lng: 76.9650,
    node_id: "N3"
  };
  listings.push(newProp);
  LocalDatabase.setTable("LISTINGS", listings);

  const slots = LocalDatabase.getTable("SLOTS");
  for (let i = 1; i <= cap; i++) {
    slots.push({
      slot_id: `S-${propertyId.replace('P-', '')}-${String.fromCharCode(64 + i)}`,
      property_id: propertyId,
      title: title,
      slot_number: `Bay ${i}`,
      vehicle_category: "CAR",
      hourly_rate: rate,
      status: "AVAILABLE",
      node_id: "N3",
      lat: 11.0180 + (i * 0.0002),
      lng: 76.9650 + (i * 0.0002),
      locked_until: null
    });
  }
  LocalDatabase.setTable("SLOTS", slots);
  LocalDatabase.addLog(`PROPERTY_ADDED: ${title} (${cap} slots @ ₹${rate}/hr) added by owner.`);

  alert(`🎉 Property Registered!\n"${title}" (${cap} Slots @ ₹${rate}/hr) has been published to the platform.`);
  closeModal("addListingModal");
  refreshOwnerData();
}

function openPayoutModal() {
  openModal("payoutModal");
}

function submitPayoutWithdrawal(e) {
  e.preventDefault();
  const amt = document.getElementById("payoutAmountInput").value;
  LocalDatabase.addLog(`PAYOUT_WITHDRAW: Owner withdrew ₹${amt}.00 via instant IMPS transfer.`);
  alert(`💸 Payout Successful!\n₹${amt}.00 has been transferred to your registered Bank Account via IMPS.`);
  closeModal("payoutModal");
}
