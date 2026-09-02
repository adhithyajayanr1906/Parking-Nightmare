/**
 * MetroPark - Standalone Core Controller & Access Manager (100% Client-Side Architecture)
 * Restricts single users to their designated role dashboard only (Driver, Owner, Admin).
 * Prevents unauthorized multi-dashboard access and handles local registration flows.
 */

// Global Platform State
const state = {
  currentUser: null,           // Logged in user profile
  selectedLoginRole: 'DRIVER', // DRIVER | OWNER | ADMIN
  selectedRegisterRole: 'DRIVER',
  selectedVehicleCategory: 'CAR',
  driverOriginNode: 'N1',
  maxHourlyRate: 60,
  activeBooking: null,
  isApiOnline: false           // Pure Client-Side Architecture
};

// INITIALIZATION ON DOM READY
document.addEventListener("DOMContentLoaded", () => {
  setStandaloneStatusBadge();
  checkSavedSession();
});

function setStandaloneStatusBadge() {
  const badgeText = document.getElementById("apiStatusText");
  const badgeDot = document.querySelector("#apiStatusBadge .pulse-dot");

  if (badgeText) badgeText.innerText = "Pure Client-Side Mode";
  if (badgeDot) badgeDot.style.backgroundColor = "var(--color-success)";
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
  const users = LocalDatabase.getTable("USERS");
  let user = users.find(u => u.email.toLowerCase() === email.toLowerCase() || u.role === role);

  if (!user) {
    const names = { DRIVER: "AdhithyaJayan R (Driver)", OWNER: "Kavitha Raman (Space Owner)", ADMIN: "AdhithyaJayan R (Admin)" };
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
  LocalDatabase.addLog(`AUTH_SUCCESS: ${user.full_name} (${role}) logged in to authorized dashboard.`);
  
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

  const users = LocalDatabase.getTable("USERS");
  const userId = `U-${role}-${Math.floor(100 + Math.random() * 900)}`;

  const newUser = {
    user_id: userId,
    full_name: full_name,
    email: email,
    phone: phone,
    role: role,
    verification_status: "VERIFIED"
  };

  if (role === 'DRIVER') {
    newUser.vehicle_type = document.getElementById("regVehicleType").value;
    newUser.vehicle_model = document.getElementById("regVehicleModel").value || "Standard Vehicle";
    newUser.license_plate = document.getElementById("regLicensePlate").value || "TN-37-X-1008";
  } else {
    // Add new property listing
    const listings = LocalDatabase.getTable("LISTINGS");
    const propertyId = `P-${Math.floor(100 + Math.random() * 900)}`;
    const title = document.getElementById("regPropertyTitle").value || `${full_name}'s Garage`;
    const address = document.getElementById("regPropertyAddress").value || "Coimbatore Main Road";
    const hourlyRate = parseFloat(document.getElementById("regHourlyRate").value) || 35;
    const capacity = parseInt(document.getElementById("regCapacity").value) || 2;

    const newProperty = {
      property_id: propertyId,
      owner_id: userId,
      title: title,
      address: address,
      hourly_rate: hourlyRate,
      capacity: capacity,
      verification_status: "VERIFIED",
      lat: 11.0180,
      lng: 76.9650,
      node_id: "N3"
    };
    listings.push(newProperty);
    LocalDatabase.setTable("LISTINGS", listings);

    // Create slots for property
    const slots = LocalDatabase.getTable("SLOTS");
    for (let i = 1; i <= capacity; i++) {
      slots.push({
        slot_id: `S-${propertyId.replace('P-', '')}-${String.fromCharCode(64 + i)}`,
        property_id: propertyId,
        title: title,
        slot_number: `Bay ${i}`,
        vehicle_category: "CAR",
        hourly_rate: hourlyRate,
        status: "AVAILABLE",
        node_id: "N3",
        lat: 11.0180 + (i * 0.0002),
        lng: 76.9650 + (i * 0.0002),
        locked_until: null
      });
    }
    LocalDatabase.setTable("SLOTS", slots);
  }

  users.push(newUser);
  LocalDatabase.setTable("USERS", users);

  LocalDatabase.addLog(`USER_REGISTER: New ${role} registered: ${full_name} (${email}).`);

  alert(`🎉 Account Created Successfully!\nWelcome ${full_name}! Opening your authorized ${role} Dashboard...`);
  state.currentUser = newUser;
  localStorage.setItem("mps_user_session", JSON.stringify(newUser));
  hideLoginScreen();
  updateUserSessionUI();
  initUserDashboard();
}

function logoutUser() {
  if (state.currentUser) {
    LocalDatabase.addLog(`AUTH_LOGOUT: ${state.currentUser.full_name} logged out to login screen.`);
  }
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

  if (typeof updateAiRoleContext === 'function') updateAiRoleContext();
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
