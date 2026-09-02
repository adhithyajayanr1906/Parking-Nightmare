/**
 * MetroPark - Core Controller & Strict Access Manager
 * Restricts single users to their designated role dashboard only (Driver, Owner, Admin).
 * Prevents unauthorized multi-dashboard access and handles registration flows.
 */

const API_BASE = "http://127.0.0.1:5000/api";

// Global Platform State
const state = {
  currentUser: null,           // Logged in user profile
  selectedLoginRole: 'DRIVER', // DRIVER | OWNER | ADMIN
  selectedRegisterRole: 'DRIVER',
  selectedVehicleCategory: 'CAR',
  driverOriginNode: 'N1',
  maxHourlyRate: 60,
  activeBooking: null,
  isApiOnline: false
};

// INITIALIZATION ON DOM READY
document.addEventListener("DOMContentLoaded", () => {
  checkApiHealth();
  checkSavedSession();
});

async function checkApiHealth() {
  const badgeText = document.getElementById("apiStatusText");
  const badgeDot = document.querySelector("#apiStatusBadge .pulse-dot");

  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      state.isApiOnline = true;
      if (badgeText) badgeText.innerText = "REST API Active";
      if (badgeDot) badgeDot.style.backgroundColor = "var(--color-success)";
    } else {
      throw new Error();
    }
  } catch (err) {
    state.isApiOnline = false;
    if (badgeText) badgeText.innerText = "Standalone Mode";
    if (badgeDot) badgeDot.style.backgroundColor = "var(--color-warning)";
  }
}

// SESSION & AUTH MANAGEMENT
function checkSavedSession() {
  const saved = localStorage.getItem("mps_user_session");
  if (saved) {
    try {
      state.currentUser = JSON.parse(saved);
      hideLoginScreen();
      updateUserSessionUI();
      initUserDashboard();
      return;
    } catch (e) {}
  }
  showLoginScreen();
}

function showLoginScreen() {
  const loginOverlay = document.getElementById("login-screen");
  if (loginOverlay) loginOverlay.classList.add("active");
}

function hideLoginScreen() {
  const loginOverlay = document.getElementById("login-screen");
  if (loginOverlay) loginOverlay.classList.remove("active");
}

function switchAuthTab(mode) {
  document.getElementById("auth-tab-login").classList.toggle("active", mode === 'login');
  document.getElementById("auth-tab-register").classList.toggle("active", mode === 'register');

  document.getElementById("loginForm").style.display = (mode === 'login') ? "flex" : "none";
  document.getElementById("registerForm").style.display = (mode === 'register') ? "flex" : "none";
}

function selectLoginRole(role) {
  state.selectedLoginRole = role;
  
  const driverCard = document.getElementById("role-card-driver");
  const ownerCard = document.getElementById("role-card-owner");
  const adminCard = document.getElementById("role-card-admin");

  if (driverCard) driverCard.classList.toggle("active", role === 'DRIVER');
  if (ownerCard) ownerCard.classList.toggle("active", role === 'OWNER');
  if (adminCard) adminCard.classList.toggle("active", role === 'ADMIN');

  const emailInput = document.getElementById("loginEmail");
  const pwdInput = document.getElementById("loginPassword");
  const hint = document.getElementById("passwordHintLabel");

  if (role === 'DRIVER') {
    if (emailInput) emailInput.value = "driver@metropark.org";
    if (pwdInput) pwdInput.value = "driver123";
    if (hint) hint.innerHTML = "🔑 Demo Password: <strong>driver123</strong>";
  } else if (role === 'OWNER') {
    if (emailInput) emailInput.value = "owner@metropark.org";
    if (pwdInput) pwdInput.value = "owner123";
    if (hint) hint.innerHTML = "🔑 Demo Password: <strong>owner123</strong>";
  } else if (role === 'ADMIN') {
    if (emailInput) emailInput.value = "admin@metropark.org";
    if (pwdInput) pwdInput.value = "admin123";
    if (hint) hint.innerHTML = "🔑 Demo Password: <strong>admin123</strong>";
  }
}

function selectRegisterRole(role) {
  state.selectedRegisterRole = role;
  const regDriver = document.getElementById("reg-card-driver");
  const regOwner = document.getElementById("reg-card-owner");

  if (regDriver) regDriver.classList.toggle("active", role === 'DRIVER');
  if (regOwner) regOwner.classList.toggle("active", role === 'OWNER');

  const driverFields = document.getElementById("driverFieldsGroup");
  const ownerFields = document.getElementById("ownerFieldsGroup");

  if (driverFields) driverFields.style.display = (role === 'DRIVER') ? "flex" : "none";
  if (ownerFields) ownerFields.style.display = (role === 'OWNER') ? "flex" : "none";
}

function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.type = input.type === "password" ? "text" : "password";
  }
}

// 1-CLICK QUICK DEMO LOGIN FOR EVALUATORS
async function quickDemoLogin(role) {
  selectLoginRole(role);
  const email = document.getElementById("loginEmail").value;
  const pwd = document.getElementById("loginPassword").value;
  await performLogin(email, pwd, role);
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const pwd = document.getElementById("loginPassword").value;
  await performLogin(email, pwd, state.selectedLoginRole);
}

async function performLogin(email, password, role) {
  let user = null;

  if (state.isApiOnline) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role })
      });
      const data = await res.json();
      if (data.success) {
        user = data.user;
      } else {
        alert(`❌ Login Failed: ${data.error}`);
        return;
      }
    } catch (e) {}
  }

  if (!user) {
    // Client-side fallback user profile
    const names = { DRIVER: "AdhithyaJayan R", OWNER: "Kavitha Raman", ADMIN: "AdhithyaJayan R (Admin)" };
    user = {
      user_id: `U-${role}-001`,
      full_name: names[role] || `${role} User`,
      email: email,
      role: role,
      verification_status: "VERIFIED"
    };
  }

  state.currentUser = user;
  localStorage.setItem("mps_user_session", JSON.stringify(user));
  hideLoginScreen();
  updateUserSessionUI();
  initUserDashboard();
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const full_name = document.getElementById("regFullName").value;
  const phone = document.getElementById("regPhone").value;
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPassword").value;
  const role = state.selectedRegisterRole;

  const payload = { full_name, phone, email, password, role };

  if (role === 'DRIVER') {
    payload.vehicle_type = document.getElementById("regVehicleType").value;
    payload.vehicle_model = document.getElementById("regVehicleModel").value || "Standard Vehicle";
    payload.license_plate = document.getElementById("regLicensePlate").value || "TN-37-X-1008";
  } else {
    payload.title = document.getElementById("regPropertyTitle").value || `${full_name}'s Garage`;
    payload.address = document.getElementById("regPropertyAddress").value || "Coimbatore Main Road";
    payload.hourly_rate = parseFloat(document.getElementById("regHourlyRate").value);
    payload.capacity = parseInt(document.getElementById("regCapacity").value);
  }

  let newUser = null;

  if (state.isApiOnline) {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        newUser = data.user;
      } else {
        alert(`❌ Registration Failed: ${data.error}`);
        return;
      }
    } catch (e) {}
  }

  if (!newUser) {
    newUser = {
      user_id: `U-${role}-REG`,
      full_name: full_name,
      email: email,
      role: role,
      verification_status: "VERIFIED"
    };
  }

  alert(`🎉 Account Created Successfully!\nWelcome ${full_name}! Opening your authorized ${role} Dashboard...`);
  state.currentUser = newUser;
  localStorage.setItem("mps_user_session", JSON.stringify(newUser));
  hideLoginScreen();
  updateUserSessionUI();
  initUserDashboard();
}

function logoutUser() {
  state.currentUser = null;
  localStorage.removeItem("mps_user_session");
  showLoginScreen();
}

// STRICT ROLE-BASED DASHBOARD ISOLATION (RESTRICT MULTI-DASHBOARD ACCESS)
function updateUserSessionUI() {
  if (!state.currentUser) return;
  const user = state.currentUser;

  const nameLbl = document.getElementById("userNameLabel");
  if (nameLbl) nameLbl.innerText = user.full_name;
  
  const roleBadge = document.getElementById("userRoleBadge");
  const iconSpan = document.getElementById("activeRoleIcon");
  const titleSpan = document.getElementById("activeRoleTitle");

  // Hide all dashboard panels first
  document.querySelectorAll('.panel-view').forEach(panel => panel.classList.remove('active'));

  if (user.role === 'DRIVER') {
    if (roleBadge) {
      roleBadge.innerText = "DRIVER";
      roleBadge.style.background = "rgba(56,189,248,0.2)";
      roleBadge.style.color = "var(--color-primary)";
    }
    if (iconSpan) iconSpan.innerText = "🚗";
    if (titleSpan) titleSpan.innerText = "Driver Workspace";
    
    // Show Driver panel ONLY
    const driverPanel = document.getElementById("driver-panel");
    if (driverPanel) driverPanel.classList.add("active");

  } else if (user.role === 'OWNER') {
    if (roleBadge) {
      roleBadge.innerText = "SPACE OWNER";
      roleBadge.style.background = "rgba(52,211,153,0.2)";
      roleBadge.style.color = "var(--color-success)";
    }
    if (iconSpan) iconSpan.innerText = "🏠";
    if (titleSpan) titleSpan.innerText = "Space Owner Portal";

    // Show Owner panel ONLY
    const ownerPanel = document.getElementById("owner-panel");
    if (ownerPanel) ownerPanel.classList.add("active");

  } else if (user.role === 'ADMIN') {
    if (roleBadge) {
      roleBadge.innerText = "ADMIN CONTROL";
      roleBadge.style.background = "rgba(251,191,36,0.2)";
      roleBadge.style.color = "var(--color-warning)";
    }
    if (iconSpan) iconSpan.innerText = "🛡️";
    if (titleSpan) titleSpan.innerText = "Admin Operations Center";

    // Show Admin panel ONLY
    const adminPanel = document.getElementById("admin-panel");
    if (adminPanel) adminPanel.classList.add("active");
  }
}

function initUserDashboard() {
  if (!state.currentUser) return;
  const role = state.currentUser.role;

  if (role === 'DRIVER' && typeof initDriverPortal === 'function') {
    initDriverPortal();
  } else if (role === 'OWNER' && typeof initOwnerPortal === 'function') {
    initOwnerPortal();
  } else if (role === 'ADMIN' && typeof initAdminPortal === 'function') {
    initAdminPortal();
  }
}

// MODAL CONTROLLERS
function openModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add('active');
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('active');
}
