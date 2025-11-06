import "../styles/styles.css";
import "leaflet/dist/leaflet.css";

import App from "./pages/app";
import { getAccessToken } from "./utils/auth";

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
  logoutButton.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
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

window.addEventListener("hashchange", () => {
  app.renderPage();
});

window.addEventListener("load", () => {
  app.renderPage();
});
