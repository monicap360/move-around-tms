/**
 * RONYX FLEET PORTAL - MAIN JAVASCRIPT
 * ====================================
 *
 * Main application logic for Ronyx Fleet Management Portal
 * Includes: Authentication, Dashboard interactions, Utilities
 */

// ================================
// CONFIGURATION & CONSTANTS
// ================================

const CONFIG = {
  supabase: {
    url: "https://wqeidcatuwqtzwhvmqfr.supabase.co",
    anonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZWlkY2F0dXdxdHp3aHZtcWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjkxNzcsImV4cCI6MjA3Njk0NTE3N30.E8bSplLakPK0obSoyhddRt64V8rFXS7ZMlaIQQaI0TQ",
  },
  routes: {
    login: "/login.html",
    dashboard: "/index.html",
    home: "/index.html",
  },
  animations: {
    duration: 300,
    easing: "ease-out",
  },
};

// ================================
// GLOBAL VARIABLES
// ================================

let supabaseClient = null;
let currentUser = null;
let isAuthenticated = false;

// ================================
// INITIALIZATION
// ================================

/**
 * Initialize the application
 */
async function initApp() {
  try {
    // Initialize Supabase client
    if (typeof supabase !== "undefined" && supabase.createClient) {
      supabaseClient = supabase.createClient(
        CONFIG.supabase.url,
        CONFIG.supabase.anonKey,
      );
      console.log("✅ Supabase client initialized");
    } else {
      console.error("❌ Supabase library not loaded");
      showError("Authentication system unavailable. Please refresh the page.");
      return;
    }

    // Check authentication status
    await checkAuthStatus();

    // Initialize page-specific features
    const currentPage = getCurrentPage();
    await initPageFeatures(currentPage);

    // Set up global event listeners
    setupGlobalEventListeners();

    console.log("✅ Ronyx Fleet Portal initialized");
  } catch (error) {
    console.error("❌ Application initialization failed:", error);
    showError("Application failed to load. Please refresh the page.");
  }
}

/**
 * Get current page identifier
 */
function getCurrentPage() {
  const path = window.location.pathname;
  const filename = path.split("/").pop() || "index.html";

  if (filename === "login.html" || path.includes("/login")) return "login";
  if (filename === "index.html" || path === "/") return "dashboard";

  return "unknown";
}

/**
 * Initialize page-specific features
 */
async function initPageFeatures(page) {
  switch (page) {
    case "login":
      await initLoginPage();
      break;
    case "dashboard":
      await initDashboardPage();
      break;
    default:
      console.log("No specific initialization for page:", page);
  }
}

// ================================
// AUTHENTICATION SYSTEM
// ================================

/**
 * Check current authentication status
 */
async function checkAuthStatus() {
  if (!supabaseClient) return false;

  try {
    const {
      data: { session },
      error,
    } = await supabaseClient.auth.getSession();

    if (error) {
      console.error("Auth check error:", error);
      return false;
    }

    if (session && session.user) {
      currentUser = session.user;
      isAuthenticated = true;
      console.log("✅ User authenticated:", session.user.email);
      return true;
    } else {
      currentUser = null;
      isAuthenticated = false;
      console.log("ℹ️ User not authenticated");
      return false;
    }
  } catch (error) {
    console.error("Authentication check failed:", error);
    return false;
  }
}

/**
 * Sign in with email and password
 */
async function signIn(email, password) {
  if (!supabaseClient) {
    throw new Error("Authentication system not available");
  }

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user) {
      currentUser = data.user;
      isAuthenticated = true;
      console.log("✅ Sign in successful:", data.user.email);
      return data;
    }
  } catch (error) {
    console.error("Sign in failed:", error);
    throw error;
  }
}

/**
 * Sign out current user
 */
async function signOut() {
  if (!supabaseClient) return;

  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      console.error("Sign out error:", error);
      return;
    }

    currentUser = null;
    isAuthenticated = false;
    console.log("✅ Sign out successful");

    // Redirect to login page
    window.location.href = CONFIG.routes.login;
  } catch (error) {
    console.error("Sign out failed:", error);
  }
}

/**
 * Get user role from metadata
 */
function getUserRole() {
  if (!currentUser || !currentUser.user_metadata) return "user";
  return currentUser.user_metadata.role || "user";
}

// ================================
// LOGIN PAGE FUNCTIONALITY
// ================================

/**
 * Initialize login page
 */
async function initLoginPage() {
  console.log("🔐 Initializing login page...");

  // Check if already authenticated
  if (isAuthenticated) {
    redirectBasedOnRole();
    return;
  }

  // Set up login form
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLoginSubmit);
  }

  // Auto-focus email field
  const emailField = document.getElementById("email");
  if (emailField) {
    emailField.focus();
  }

  console.log("✅ Login page initialized");
}

/**
 * Handle login form submission
 */
async function handleLoginSubmit(event) {
  event.preventDefault();

  const emailField = document.getElementById("email");
  const passwordField = document.getElementById("password");
  const errorDiv = document.getElementById("error");
  const submitButton = event.target.querySelector('button[type="submit"]');

  if (!emailField || !passwordField) {
    showError("Login form fields not found");
    return;
  }

  const email = emailField.value.trim();
  const password = passwordField.value;

  // Validation
  if (!email || !password) {
    showError("Please enter both email and password");
    return;
  }

  // Show loading state
  const originalButtonText = submitButton.textContent;
  submitButton.textContent = "Signing In...";
  submitButton.disabled = true;
  hideError();

  try {
    // Attempt sign in
    const result = await signIn(email, password);

    if (result && result.user) {
      showSuccess("Login successful! Redirecting...");

      // Small delay for user feedback, then redirect
      setTimeout(() => {
        redirectBasedOnRole();
      }, 1000);
    }
  } catch (error) {
    showError(error.message || "Login failed. Please try again.");
  } finally {
    // Reset button state
    submitButton.textContent = originalButtonText;
    submitButton.disabled = false;
  }
}

/**
 * Redirect user based on their role
 */
function redirectBasedOnRole() {
  const role = getUserRole();

  switch (role) {
    case "manager":
      window.location.href = CONFIG.routes.dashboard;
      break;
    case "admin":
    case "super_admin":
      window.location.href = "/admin/dashboard.html"; // If admin dashboard exists
      break;
    default:
      window.location.href = CONFIG.routes.home;
  }
}

// ================================
// DASHBOARD PAGE FUNCTIONALITY
// ================================

/**
 * Initialize dashboard page
 */
async function initDashboardPage() {
  console.log("📊 Initializing dashboard page...");

  // Check authentication
  if (!isAuthenticated) {
    console.log("User not authenticated, redirecting to login...");
    window.location.href = CONFIG.routes.login;
    return;
  }

  // Update user info display
  updateUserInfo();

  // Set up dashboard interactions
  setupDashboardEventListeners();

  // Load dashboard data
  await loadDashboardData();

  // Set up periodic data refresh
  setupDataRefresh();

  console.log("✅ Dashboard initialized");
}

/**
 * Update user information display
 */
function updateUserInfo() {
  const userInfoElement = document.getElementById("userInfo");
  if (userInfoElement && currentUser) {
    userInfoElement.innerHTML = `
            <div class="user-info">
                <strong>Logged in as:</strong> ${currentUser.email}
                <br>
                <small>Role: ${getUserRole()}</small>
            </div>
        `;
  }
}

/**
 * Set up dashboard event listeners
 */
function setupDashboardEventListeners() {
  // Sign out button
  const signOutBtn = document.getElementById("signOutBtn");
  if (signOutBtn) {
    signOutBtn.addEventListener("click", handleSignOutClick);
  }

  // Quick action buttons
  const quickActionButtons = document.querySelectorAll(".quick-action-btn");
  quickActionButtons.forEach((button) => {
    button.addEventListener("click", handleQuickAction);
  });
}

/**
 * Handle sign out button click
 */
async function handleSignOutClick(event) {
  event.preventDefault();

  if (confirm("Are you sure you want to sign out?")) {
    await signOut();
  }
}

/**
 * Handle quick action button clicks
 */
function handleQuickAction(event) {
  const action = event.target.dataset.action;

  switch (action) {
    case "create-route":
      showInfo("Create New Route feature coming soon!");
      break;
    case "view-reports":
      showInfo("View Reports feature coming soon!");
      break;
    case "manage-drivers":
      showInfo("Manage Drivers feature coming soon!");
      break;
    default:
      showInfo("Feature coming soon!");
  }
}

/**
 * Load dashboard data
 */
async function loadDashboardData() {
  // Simulate loading dashboard data
  // In a real application, this would fetch from your API or Supabase

  console.log("📊 Loading dashboard data...");

  try {
    // Show loading state
    showLoadingState();

    // Simulate API delay
    await delay(1500);

    // Update dashboard widgets
    updateFleetStats();
    updateRecentActivity();

    hideLoadingState();
    console.log("✅ Dashboard data loaded");
  } catch (error) {
    hideLoadingState();
    console.error("❌ Failed to load dashboard data:", error);
    showError("Failed to load dashboard data. Please refresh the page.");
  }
}

/**
 * Update fleet statistics
 */
function updateFleetStats() {
  const stats = {
    activeVehicles: 12,
    availableDrivers: 8,
    currentRoutes: 5,
    maintenanceDue: 2,
  };

  // Update stat displays (if elements exist)
  updateStatElement("activeVehicles", stats.activeVehicles);
  updateStatElement("availableDrivers", stats.availableDrivers);
  updateStatElement("currentRoutes", stats.currentRoutes);
  updateStatElement("maintenanceDue", stats.maintenanceDue);
}

/**
 * Update individual stat element
 */
function updateStatElement(statId, value) {
  const element = document.getElementById(statId);
  if (element) {
    element.textContent = value;
  }
}

/**
 * Update recent activity feed
 */
function updateRecentActivity() {
  const activities = [
    "Route #1234 completed successfully",
    "Driver John D. checked in at depot",
    "Vehicle maintenance scheduled for Truck #456",
    "New load assignment ready for pickup",
    "Fuel report submitted for Route #890",
  ];

  const activityList = document.getElementById("activityList");
  if (activityList) {
    activityList.innerHTML = activities
      .map(
        (activity) => `
                <li class="activity-item">
                    <span class="activity-icon"></span>
                    <span class="activity-text">${activity}</span>
                </li>
            `,
      )
      .join("");
  }
}

// ================================
// GLOBAL EVENT LISTENERS
// ================================

/**
 * Set up global event listeners
 */
function setupGlobalEventListeners() {
  // Handle authentication state changes
  if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event);

      if (event === "SIGNED_OUT") {
        currentUser = null;
        isAuthenticated = false;
        window.location.href = CONFIG.routes.login;
      } else if (event === "SIGNED_IN" && session) {
        currentUser = session.user;
        isAuthenticated = true;
      }
    });
  }

  // Handle network status
  window.addEventListener("online", () => {
    hideError();
    showSuccess("Connection restored");
  });

  window.addEventListener("offline", () => {
    showError("You are currently offline. Some features may not be available.");
  });
}

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Show error message
 */
function showError(message) {
  console.error("Error:", message);

  const errorElement = document.getElementById("error");
  if (errorElement) {
    errorElement.textContent = `❌ ${message}`;
    errorElement.style.display = "block";
    errorElement.className = "error-message fade-in";
  }
}

/**
 * Show success message
 */
function showSuccess(message) {
  console.log("Success:", message);

  let successElement = document.getElementById("success");
  if (!successElement) {
    // Create success element if it doesn't exist
    successElement = document.createElement("div");
    successElement.id = "success";
    document.body.appendChild(successElement);
  }

  successElement.textContent = `✅ ${message}`;
  successElement.className = "success-message fade-in";
  successElement.style.display = "block";

  // Auto-hide after 3 seconds
  setTimeout(hideSuccess, 3000);
}

/**
 * Show info message
 */
function showInfo(message) {
  console.log("Info:", message);
  alert(message); // Simple implementation - could be enhanced with custom modal
}

/**
 * Hide error message
 */
function hideError() {
  const errorElement = document.getElementById("error");
  if (errorElement) {
    errorElement.style.display = "none";
  }
}

/**
 * Hide success message
 */
function hideSuccess() {
  const successElement = document.getElementById("success");
  if (successElement) {
    successElement.style.display = "none";
  }
}

/**
 * Show loading state
 */
function showLoadingState() {
  const loadingElements = document.querySelectorAll(".loading-placeholder");
  loadingElements.forEach((el) => {
    el.innerHTML = '<div class="spinner"></div>';
  });
}

/**
 * Hide loading state
 */
function hideLoadingState() {
  const loadingElements = document.querySelectorAll(".loading-placeholder");
  loadingElements.forEach((el) => {
    el.innerHTML = "";
  });
}

/**
 * Setup periodic data refresh
 */
function setupDataRefresh() {
  // Refresh dashboard data every 5 minutes
  setInterval(
    async () => {
      if (isAuthenticated && getCurrentPage() === "dashboard") {
        console.log("🔄 Refreshing dashboard data...");
        await loadDashboardData();
      }
    },
    5 * 60 * 1000,
  ); // 5 minutes
}

/**
 * Utility delay function
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format date for display
 */
function formatDate(date) {
  if (!date) return "";

  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  } catch (error) {
    console.error("Date formatting error:", error);
    return date.toString();
  }
}

/**
 * Debounce function for performance
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ================================
// INITIALIZATION
// ================================

// Initialize app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

// Global error handling
window.addEventListener("error", (event) => {
  console.error("Global error:", event.error);
  showError(
    "An unexpected error occurred. Please refresh the page if problems persist.",
  );
});

// Prevent console errors from breaking the app
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
  event.preventDefault(); // Prevent the default browser error handling
});

console.log("🚛 Ronyx Fleet Portal JavaScript loaded");

// Export for potential module use
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    initApp,
    signIn,
    signOut,
    checkAuthStatus,
    CONFIG,
  };
}
