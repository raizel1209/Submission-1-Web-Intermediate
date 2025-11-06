import "../styles/styles.css";
import "leaflet/dist/leaflet.css";
import App from "./pages/app";
import { getAccessToken } from "./utils/auth";
import { logout } from './utils/auth';
import { requestNotificationPermission, unsubscribeNotification } from './utils/notification';

const token = getAccessToken();
const url = location.hash;

if (!location.hash || location.hash === "#") {
  location.hash = getAccessToken() ? "#/" : "#/login";
}

const app = new App({
  content: document.querySelector("#main-content"),
  drawerButton: document.querySelector("#drawer-button"),
  navigationDrawer: document.querySelector("#navbar"),
});

// Logout button wiring: remove token and redirect to login
const logoutButton = document.getElementById("logout-button");
if (logoutButton) {
  logoutButton.addEventListener("click", async (e) => { // <-- jadikan async
    e.preventDefault();
    
    await logout(); // <-- panggil fungsi logout()
    
    // update UI
    const loginLink = document.getElementById("login-link");
    const navbar = document.getElementById("navbar");
    if (loginLink) loginLink.style.display = "inline";
    if (navbar) navbar.style.display = "none";
    // set aria-hidden
    logoutButton.style.display = "none";
    logoutButton.setAttribute("aria-hidden", "true");
    if (loginLink) loginLink.removeAttribute("aria-hidden");
    location.hash = "#/login";
  });
}

// --- 2. TAMBAHKAN BLOK KODE INI ---
// Notification button wiring
const notificationButton = document.getElementById("notification-toggle");
if (notificationButton) {
  notificationButton.addEventListener("click", async (e) => {
    e.preventDefault();
    
    // Cek status dari data attribute
    const isSubscribed = notificationButton.dataset.subscribed === 'true';

    if (isSubscribed) {
      // Jika sudah subscribe -> panggil unsubscribe
      await unsubscribeNotification();
    } else {
      // Jika belum subscribe -> panggil subscribe
      await requestNotificationPermission();
    }
  });
}
// --- AKHIR BLOK KODE BARU ---

window.addEventListener("hashchange", () => {
  app.renderPage();
});

window.addEventListener('load', () => {
  app.renderPage();
  registerServiceWorker(); // <-- Panggil fungsi registrasi
});

// Fungsi untuk registrasi SW
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};