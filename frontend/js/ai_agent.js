/**
 * MetroPark - MetroAI Mobility Assistant Agent
 * Provides intelligent, context-aware Q&A support for Drivers, Space Owners, and Admins.
 */

// Initialize AI Agent on DOM Load
document.addEventListener("DOMContentLoaded", () => {
  renderAiAgentWidget();
});

function renderAiAgentWidget() {
  if (document.getElementById("ai-floating-btn")) return;

  // 1. Create Floating Action Button (FAB)
  const fab = document.createElement("button");
  fab.id = "ai-floating-btn";
  fab.className = "ai-fab-btn";
  fab.onclick = toggleAiChatDrawer;
  fab.innerHTML = `
    <span class="ai-fab-icon">🤖</span>
    <span class="ai-fab-text">Ask MetroAI</span>
    <span class="ai-fab-pulse"></span>
  `;
  document.body.appendChild(fab);

  // 2. Create Chat Drawer Widget Container
  const drawer = document.createElement("div");
  drawer.id = "ai-chat-drawer";
  drawer.className = "ai-chat-drawer";
  drawer.innerHTML = `
    <div class="ai-drawer-header">
      <div style="display:flex; align-items:center; gap:0.6rem;">
        <div class="ai-avatar-icon">🤖</div>
        <div>
          <h3 class="ai-header-title">MetroAI Mobility Assistant</h3>
          <div class="ai-header-subtitle">24/7 Smart Platform Knowledge Agent</div>
        </div>
      </div>
      <div style="display:flex; gap:0.5rem; align-items:center;">
        <button class="ai-header-btn" onclick="clearAiChatHistory()" title="Clear Chat">🧹</button>
        <button class="ai-header-btn" onclick="toggleAiChatDrawer()" title="Close Drawer">✕</button>
      </div>
    </div>

    <!-- ROLE CONTEXT BADGE -->
    <div class="ai-role-context-bar">
      <span style="font-size:0.75rem; color:var(--text-muted);">Context Mode:</span>
      <span id="aiContextRoleBadge" class="user-role-tag">DRIVER VIEW</span>
    </div>

    <!-- QUICK PROMPT CHIPS -->
    <div class="ai-chips-container" id="aiQuickChips">
      <!-- Populated dynamically based on user role -->
    </div>

    <!-- CHAT MESSAGES FEED -->
    <div class="ai-messages-feed" id="aiChatMessages">
      <div class="ai-msg assistant">
        <div class="ai-msg-bubble">
          👋 Hello! I am <strong>MetroAI</strong>, your mobility assistant. Ask me any general or role-specific questions about parking reservations, Dijkstra routing, earnings payouts, or platform supervision!
        </div>
      </div>
    </div>

    <!-- INPUT FORM -->
    <form class="ai-input-form" onsubmit="handleAiQuerySubmit(event)">
      <input type="text" id="aiQueryInput" class="ai-input-field" placeholder="Ask any question or doubt..." autocomplete="off" required>
      <button type="submit" class="ai-send-btn" id="aiSendBtn">🚀 Send</button>
    </form>
  `;
  document.body.appendChild(drawer);

  updateAiRoleContext();
}

function toggleAiChatDrawer() {
  const drawer = document.getElementById("ai-chat-drawer");
  if (!drawer) return;

  const isActive = drawer.classList.contains("active");
  if (!isActive) {
    updateAiRoleContext();
    drawer.classList.add("active");
    document.getElementById("aiQueryInput")?.focus();
  } else {
    drawer.classList.remove("active");
  }
}

function updateAiRoleContext() {
  const currentRole = state.currentUser ? state.currentUser.role : (state.selectedLoginRole || 'DRIVER');
  const badge = document.getElementById("aiContextRoleBadge");
  const chipsContainer = document.getElementById("aiQuickChips");

  if (badge) {
    badge.innerText = `${currentRole} ASSISTANT`;
    if (currentRole === 'DRIVER') {
      badge.style.background = "rgba(56,189,248,0.2)";
      badge.style.color = "var(--color-primary)";
    } else if (currentRole === 'OWNER') {
      badge.style.background = "rgba(52,211,153,0.2)";
      badge.style.color = "var(--color-success)";
    } else {
      badge.style.background = "rgba(251,191,36,0.2)";
      badge.style.color = "var(--color-warning)";
    }
  }

  // Populate Role-Specific Quick Chips
  if (chipsContainer) {
    let chips = [];
    if (currentRole === 'DRIVER') {
      chips = [
        "🔒 How does 15-min slot reservation work?",
        "🗺️ How does Dijkstra road routing work?",
        "🔄 What if my slot gets taken mid-transit?",
        "🌱 How is CO₂ saved calculated?"
      ];
    } else if (currentRole === 'OWNER') {
      chips = [
        "💰 How do earnings payouts work (90/10 split)?",
        "➕ How do I list a new garage/driveway?",
        "🟢 What do the slot status colors mean?",
        "⏰ Can drivers exceed their reserved time?"
      ];
    } else {
      chips = [
        "🔓 How do I force release a locked slot?",
        "📋 How are property owners verified?",
        "📊 How is total platform commission tracked?",
        "⚙️ How does the 15-min countdown worker daemon function?"
      ];
    }

    chipsContainer.innerHTML = chips.map(chip => `
      <button type="button" class="ai-chip-btn" onclick="sendQuickChipQuery('${chip.replace(/'/g, "\\'")}')">${chip}</button>
    `).join('');
  }
}

function sendQuickChipQuery(chipText) {
  // Strip icon emoji
  const query = chipText.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]\s*/u, '');
  const input = document.getElementById("aiQueryInput");
  if (input) input.value = query;
  handleAiQuerySubmit(new Event('submit'));
}

async function handleAiQuerySubmit(e) {
  e.preventDefault();
  const input = document.getElementById("aiQueryInput");
  if (!input) return;

  const query = input.value.trim();
  if (!query) return;

  input.value = "";
  appendChatMessage("user", query);

  // Show Typing Indicator
  showAiTypingIndicator();

  const userRole = state.currentUser ? state.currentUser.role : (state.selectedLoginRole || 'DRIVER');

  try {
    let responseText = "";

    if (state.isApiOnline) {
      try {
        const res = await fetch(`${API_BASE}/ai/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, role: userRole })
        });
        const data = await res.json();
        if (data.success && data.answer) {
          responseText = data.answer;
        }
      } catch (err) {}
    }

    if (!responseText) {
      // Local Intelligent NLP Knowledge Agent Fallback
      responseText = generateLocalAiAnswer(query, userRole);
    }

    removeAiTypingIndicator();
    appendChatMessage("assistant", responseText);

  } catch (err) {
    removeAiTypingIndicator();
    appendChatMessage("assistant", "⚠️ I experienced a temporary network issue. Please ask again!");
  }
}

function appendChatMessage(sender, text) {
  const feed = document.getElementById("aiChatMessages");
  if (!feed) return;

  const msgDiv = document.createElement("div");
  msgDiv.className = `ai-msg ${sender}`;

  // Convert line breaks and bold syntax
  const formattedText = text
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1); padding:2px 5px; border-radius:4px; font-family:var(--font-mono);">$1</code>');

  msgDiv.innerHTML = `<div class="ai-msg-bubble">${formattedText}</div>`;
  feed.appendChild(msgDiv);
  feed.scrollTop = feed.scrollHeight;
}

function showAiTypingIndicator() {
  const feed = document.getElementById("aiChatMessages");
  if (!feed) return;

  const typingDiv = document.createElement("div");
  typingDiv.id = "aiTypingIndicator";
  typingDiv.className = "ai-msg assistant";
  typingDiv.innerHTML = `
    <div class="ai-msg-bubble typing">
      <span>🤖 MetroAI is thinking</span>
      <span class="dot-flashing"></span>
    </div>
  `;
  feed.appendChild(typingDiv);
  feed.scrollTop = feed.scrollHeight;
}

function removeAiTypingIndicator() {
  const indicator = document.getElementById("aiTypingIndicator");
  if (indicator) indicator.remove();
}

function clearAiChatHistory() {
  const feed = document.getElementById("aiChatMessages");
  if (feed) {
    feed.innerHTML = `
      <div class="ai-msg assistant">
        <div class="ai-msg-bubble">
          🧹 Chat history cleared. How can I assist you with MetroPark platform questions?
        </div>
      </div>
    `;
  }
}

// LOCAL INTELLIGENT KNOWLEDGE AGENT ENGINE (NLP MATCHING)
function generateLocalAiAnswer(query, role) {
  const q = query.toLowerCase();

  // 1. Slot Reservation & 15-min Lock
  if (q.includes("15") || q.includes("lock") || q.includes("reserve") || q.includes("hold") || q.includes("timeout")) {
    return `🔒 **15-Minute Atomic Slot Lock Mechanism**\n\nWhen a driver reserves a parking spot:\n1. The slot state transitions atomically from \`AVAILABLE\` -> \`RESERVED\`.\n2. A 15-minute countdown worker thread locks the slot specifically for your vehicle plate.\n3. If you confirm arrival within 15 minutes, state becomes \`OCCUPIED\`.\n4. If 15 minutes elapse without check-in, the system automatically releases the lock back to \`AVAILABLE\` to prevent slot hoarding!`;
  }

  // 2. Dijkstra Routing & OSRM Engine
  if (q.includes("dijkstra") || q.includes("route") || q.includes("map") || q.includes("algorithm") || q.includes("path") || q.includes("osrm")) {
    return `🗺️ **Dijkstra Graph & OSRM Real Road Engine**\n\n- **Formula**: $d(v) = \\min_{u} (d(u) + w(u, v))$\n- Edge weights $w(u, v)$ account for street distance, speed limit (km/h), and live traffic factors.\n- **OSRM Integration**: Queries real street coordinates so polyline navigation strictly bends along actual roads (Cross Cut Rd, 100 Feet Rd, Avinashi Rd) rather than drawing straight lines!`;
  }

  // 3. CO2 Carbon Offset & SDG Alignment
  if (q.includes("co2") || q.includes("carbon") || q.includes("environment") || q.includes("sdg") || q.includes("green")) {
    return `🌱 **CO₂ Offset & UN SDG Alignment**\n\n- **Formula**: $\\text{Saved CO}_2 = \\text{Cruising Distance Eliminated (km)} \\times 0.12\\text{ kg CO}_2/\\text{km}$\n- Cruising around searching for parking causes ~30% of urban congestion.\n- Direct graph routing saves up to **0.42 kg CO₂ per trip**, supporting **UN SDG 11** (Sustainable Cities) & **SDG 12** (Responsible Resource Consumption).`;
  }

  // 4. Occupancy Conflict & Dynamic Rerouting
  if (q.includes("taken") || q.includes("conflict") || q.includes("full") || q.includes("occupied") || q.includes("reroute")) {
    return `🔄 **Smart Dynamic Rerouting**\n\nIf your reserved slot is taken or occupied while you are in transit:\n1. The system detects the occupancy change in real-time.\n2. The **Dynamic Rerouting Engine** queries remaining candidate spots.\n3. Navigation instantly recalculates the shortest road path to the next nearest available space without requiring manual re-searches!`;
  }

  // 5. Earnings, Bank Payouts & 90/10 Split
  if (q.includes("payout") || q.includes("earning") || q.includes("money") || q.includes("withdraw") || q.includes("split") || q.includes("commission") || q.includes("percent")) {
    return `💰 **Financial Revenue Split & IMPS Bank Payouts**\n\n- **Space Owner Payout**: Property owners receive **90%** of total gross rental fees.\n- **Platform Fee**: MetroPark retains **10%** commission for infrastructure & routing.\n- **Withdrawal**: Space owners can click **"💸 Withdraw Earnings"** anytime to initiate instant IMPS bank transfers directly to their registered bank account.`;
  }

  // 6. Listing Garage & Space Owner Management
  if (q.includes("list") || q.includes("garage") || q.includes("driveway") || q.includes("add space") || q.includes("property")) {
    return `➕ **Listing Your Private Parking Space**\n\n1. Log in as a **Space Owner**.\n2. Click **"➕ List New Parking Space"** on your dashboard.\n3. Enter property title, address, hourly rate (e.g. ₹35/hr), and slot capacity.\n4. Once submitted, your listing is placed in the Admin Verification Queue and will go live immediately upon verification!`;
  }

  // 7. Admin Supervision & Force Release
  if (q.includes("admin") || q.includes("override") || q.includes("force") || q.includes("release") || q.includes("verify")) {
    return `🛡️ **Admin Supervision & System Overrides**\n\n- **Force Release**: Admins can enter any Slot ID (e.g., \`S-101-B\`) and click **"🔓 Force Release Lock"** to override stuck states.\n- **Verification Queue**: Review and approve newly registered property owners or drivers with 1-click.\n- **Financial Oversight**: Track total gross bookings, 10% platform commission, and 90% owner payouts.`;
  }

  // 8. Accounts & Registration
  if (q.includes("register") || q.includes("account") || q.includes("password") || q.includes("login") || q.includes("sign up")) {
    return `✍️ **User Registration & Account Isolation**\n\n- New users can click **"✍️ New User Registration"** on the login screen.\n- Select **Driver Account** (enter vehicle type, license plate) or **Rent Space Owner** (enter property title, hourly rate).\n- **Role Isolation**: Upon login, users are restricted strictly to their assigned single-role dashboard for security.`;
  }

  // General Catch-all Response
  return `🤖 **MetroAI General Knowledge**\n\nMetroPark connects drivers looking for parking with private space owners who want to monetize unused driveways and garages.\n\n- **Role**: Active as **${role}**\n- **Key Features**: OSRM real road navigation, 15-min atomic slot locks, 90/10 financial split, and admin supervision.\n\nFeel free to ask specific doubts about reservations, pricing, payouts, or route calculations!`;
}
