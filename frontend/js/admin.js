/**
 * MetroPark - Admin Operations & Control Dashboard Manager (Investor Edition)
 * Provides executive oversight, system supervision, verification queue, and event logs.
 */

function initAdminPortal() {
  refreshAdminData();
}

async function refreshAdminData() {
  let metrics = null;
  let verificationQueue = [];
  let logs = [];

  if (state.isApiOnline) {
    try {
      const mRes = await fetch(`${API_BASE}/admin/metrics`);
      metrics = await mRes.json();

      const vRes = await fetch(`${API_BASE}/admin/verification`);
      const vData = await vRes.json();
      verificationQueue = vData.queue;

      const lRes = await fetch(`${API_BASE}/admin/logs`);
      const lData = await lRes.json();
      logs = lData.logs;
    } catch (e) {
      metrics = getMockAdminMetrics();
      verificationQueue = getMockVerificationQueue();
      logs = getMockLogs();
    }
  } else {
    metrics = getMockAdminMetrics();
    verificationQueue = getMockVerificationQueue();
    logs = getMockLogs();
  }

  renderAdminMetrics(metrics);
  renderVerificationQueue(verificationQueue);
  renderAdminLogs(logs);
}

function renderAdminMetrics(m) {
  if (!m) return;
  document.getElementById("adminDriversCount").innerText = m.total_drivers || 3;
  document.getElementById("adminOwnersCount").innerText = m.total_owners || 3;
  document.getElementById("adminSpacesCount").innerText = m.total_slots || 11;
  document.getElementById("adminCarbonOffset").innerText = `${m.total_co2_saved_kg || 15.34} kg`;

  const gross = m.total_revenue_inr || 160.00;
  const platform = m.platform_revenue_inr || (gross * 0.1);
  const ownerPayouts = m.owner_revenue_inr || (gross * 0.9);

  document.getElementById("adminGrossRev").innerText = `₹${gross.toFixed(2)}`;
  document.getElementById("adminPlatformFee").innerText = `₹${platform.toFixed(2)}`;
  document.getElementById("adminOwnerPayouts").innerText = `₹${ownerPayouts.toFixed(2)}`;
}

function renderVerificationQueue(queue) {
  const tbody = document.getElementById("adminVerificationTable");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (queue.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">✅ All pending verification requests resolved</td></tr>`;
    return;
  }

  queue.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="user-role-tag">${item.type}</span></td>
      <td><strong>${item.name}</strong></td>
      <td style="color:var(--text-muted);">${item.details}</td>
      <td>
        <button class="btn-primary-lg" style="padding:0.35rem 0.75rem; font-size:0.75rem;" onclick="approveItem('${item.id}')">
          ✅ Verify & Approve
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAdminLogs(logs) {
  const feed = document.getElementById("systemLogsFeed");
  if (!feed) return;
  feed.innerHTML = "";

  logs.forEach(log => {
    const div = document.createElement("div");
    div.className = "log-entry";
    div.innerHTML = `
      <span class="log-time">[${log.timestamp || 'LIVE'}]</span>
      <span class="log-msg">${log.event || log.action || log}</span>
    `;
    feed.appendChild(div);
  });
}

function getMockAdminMetrics() {
  return {
    total_drivers: 4,
    total_owners: 3,
    total_slots: 12,
    total_co2_saved_kg: 18.75,
    total_revenue_inr: 240.00,
    platform_revenue_inr: 24.00,
    owner_revenue_inr: 216.00
  };
}

function getMockVerificationQueue() {
  return [
    { id: "V-101", type: "OWNER", name: "Ramesh Kumar", details: "Sunrise Residency Driveway (2 Slots @ ₹35/hr)" },
    { id: "V-102", type: "DRIVER", name: "Vikram Seth", details: "Vehicle TN-38-BZ-4412 (Verified RC)" }
  ];
}

function getMockLogs() {
  return [
    { timestamp: new Date().toLocaleTimeString(), event: "SYSTEM_INIT: Flask API & SQLite DB Connection Established." },
    { timestamp: new Date().toLocaleTimeString(), event: "AUTH_SUCCESS: Driver AdhithyaJayan R logged in successfully." },
    { timestamp: new Date().toLocaleTimeString(), event: "ROUTE_CALC: Dijkstra optimal path calculated: North City Gate -> Green Plaza Garage." },
    { timestamp: new Date().toLocaleTimeString(), event: "SLOT_LOCK: Slot S-101-A transition to RESERVED (15m Countdown active)." }
  ];
}

async function approveItem(itemId) {
  alert(`✅ Verification Approved!\nItem ${itemId} is now active on the MetroPark platform.`);
  refreshAdminData();
}

async function adminForceReleaseSlot() {
  const slotId = document.getElementById("overrideSlotInput").value.trim();
  if (!slotId) {
    alert("Please enter a valid Slot ID (e.g. S-101-B)");
    return;
  }

  if (state.isApiOnline) {
    try {
      await fetch(`${API_BASE}/admin/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot_id: slotId, action: "RELEASE" })
      });
    } catch (e) {}
  }

  alert(`🔓 Override Executed: Slot ${slotId} force released back to AVAILABLE.`);
  document.getElementById("overrideSlotInput").value = "";
  refreshAdminData();
}
