import routes from "../routes/routes";
import { getActiveRoute } from "../routes/url-parser";
import { getAccessToken } from "../utils/auth";
import { setNotificationButtonState } from "../utils/notification";

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;

    this._setupDrawer();
  }

  _setupDrawer() {
    // ... (Kode _setupDrawer Anda tidak perlu diubah) ...
    if (!this.#drawerButton || !this.#navigationDrawer) return;

    const toggleDrawer = (open) => {
      this.#navigationDrawer.classList.toggle("open", open);
      if (this.#drawerButton) {
        this.#drawerButton.setAttribute(
          "aria-expanded",
          String(this.#navigationDrawer.classList.contains("open"))
        );
      }
    };

    this.#drawerButton.addEventListener("click", () => {
      toggleDrawer(!this.#navigationDrawer.classList.contains("open"));
    });

    this.#drawerButton.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleDrawer(!this.#navigationDrawer.classList.contains("open"));
      }
    });

    document.body.addEventListener("click", (event) => {
      const navDrawer = this.#navigationDrawer;
      const drawerBtn = this.#drawerButton;

      if (
        navDrawer &&
        drawerBtn &&
        !navDrawer.contains(event.target) &&
        !drawerBtn.contains(event.target)
      ) {
        navDrawer.classList.remove("open");
      }

      if (navDrawer) {
        navDrawer.querySelectorAll("a").forEach((link) => {
          if (link.contains(event.target)) {
            navDrawer.classList.remove("open");
            if (this.#drawerButton)
              this.#drawerButton.setAttribute("aria-expanded", "false");
          }
        });
      }
    });
  }

  async renderPage() {
    const url = getActiveRoute();
    const isLogin = !!getAccessToken();

    // --- LOGIKA AUTENTIKASI BARU (PINDAH DARI routes.js) ---
    const unauthenticatedRoutesOnly = ["/login", "/register"];
    const isAuthenticatedRoute = !unauthenticatedRoutesOnly.includes(url);

    // Skenario 1: User belum login TAPI mencoba akses halaman privat (cth: "/")
    if (isAuthenticatedRoute && !isLogin) {
      location.hash = "/login";
      return; // Stop rendering, redirect ke login
    }

    // Skenario 2: User sudah login TAPI mencoba akses halaman login/register
    if (!isAuthenticatedRoute && isLogin) {
      location.hash = "/";
      return; // Stop rendering, redirect ke beranda
    }
    // --- AKHIR LOGIKA AUTENTIKASI ---

    const page = routes[url];

    if (!page) {
      // Jika rute tidak ditemukan (404), redirect ke halaman yang sesuai
      console.log(`Rute tidak ditemukan untuk: ${url}`);
      location.hash = isLogin ? "/" : "/login";
      return;
    }

    // Mengelola tampilan UI berdasarkan status login
    const navbar = document.getElementById("navbar");
    if (navbar) {
      navbar.style.display = isLogin ? "block" : "none";
    }

    const loginLink = document.getElementById("login-link");
    const logoutButton = document.getElementById("logout-button");
    const notifButton = document.getElementById("notification-toggle");

    if (loginLink) {
      loginLink.style.display = isLogin ? "none" : "inline";
      loginLink.setAttribute("aria-hidden", String(isLogin));
    }
    if (logoutButton) {
      logoutButton.style.display = isLogin ? "inline" : "none";
      logoutButton.setAttribute("aria-hidden", String(!isLogin));
    }
    
    if (notifButton) {
      notifButton.style.display = isLogin ? "inline" : "none";
      notifButton.setAttribute("aria-hidden", String(!isLogin));
      
      // 2. PANGGIL FUNGSI INI SAAT LOGIN
      if (isLogin) {
        setNotificationButtonState();
      }
    }

    // Render halaman
    const renderContent = async () => {
      this.#content.innerHTML = await page.render();
      await page.afterRender();
    };

    if ("startViewTransition" in document) {
      document.startViewTransition(renderContent);
    } else {
      await renderContent();
    }
  }
}

export default App;