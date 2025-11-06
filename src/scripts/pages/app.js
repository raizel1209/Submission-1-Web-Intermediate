import routes from "../routes/routes";
import { getActiveRoute } from "../routes/url-parser";
import { getAccessToken } from "../utils/auth";

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

    // allow keyboard activation (Enter/Space)
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

    const allowedWithoutLogin = ["/login", "/register"];
    const isAllowed = allowedWithoutLogin.includes(url);

    if (!isLogin && !isAllowed) {
      location.hash = "/login";
      return;
    }

    const page = routes[url];

    if (!page) {
      location.hash = "/login";
      return;
    }

    const navbar = document.getElementById("navbar");
    if (navbar) {
      navbar.style.display = isLogin ? "block" : "none";
    }

    // Toggle login/logout link visibility for accessibility
    const loginLink = document.getElementById("login-link");
    const logoutButton = document.getElementById("logout-button");
    if (loginLink) {
      loginLink.style.display = isLogin ? "none" : "inline";
      loginLink.setAttribute("aria-hidden", String(isLogin));
    }
    if (logoutButton) {
      logoutButton.style.display = isLogin ? "inline" : "none";
      logoutButton.setAttribute("aria-hidden", String(!isLogin));
    }

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
