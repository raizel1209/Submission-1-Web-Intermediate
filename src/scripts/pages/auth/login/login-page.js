import LoginPresenter from "./login-presenter";
import * as ApiService from "../../../data/api";
import * as AuthModel from "../../../utils/auth";

export default class LoginPage {
  #presenter = null;

  async render() {
    // ... (kode render Anda tetap sama)
    return `
      <a href="#main-content" class="skip-to-content" id="skip-to-content-link">Skip to main content</a>
      <section class="login-container fade-in" id="main-content" tabindex="-1">
        <article class="login-form-container">
          <h1 class="login__title">Masuk akun</h1>

          <form id="login-form" class="login-form" aria-labelledby="login__title">
            <div class="form-control">
              <label for="email-input" class="login-form__email-title">Email</label>
              <input id="email-input" type="email" name="email" placeholder="Contoh: nama@email.com" required aria-describedby="email-help">
              <span id="email-help" class="visually-hidden">Masukkan email Anda yang terdaftar</span>
            </div>
            <div class="form-control">
              <label for="password-input" class="login-form__password-title">Password</label>
              <input id="password-input" type="password" name="password" placeholder="Masukkan password Anda" required aria-describedby="password-help">
              <span id="password-help" class="visually-hidden">Masukkan password yang sudah terdaftar</span>
            </div>
            <div class="form-buttons login-form__form-buttons">
              <span id="submit-button-container">
                <button class="btn" type="submit">Masuk</button>
              </span>

              <p class="login-form__do-not-have-account">Belum punya akun? <a href="#/register">Daftar</a></p>
            </div>
          </form>
        </article>
      </section>
    `;
  }

  async afterRender() {
    this.#presenter = new LoginPresenter({
      view: this,
      model: ApiService,
      authModel: AuthModel,
    });
    // ... (kode skip link) ...
    this.#setupForm(); // <-- Perbarui fungsi ini
    this.#addFadeInEffect();
  }

  #setupForm() {
    const form = document.getElementById("login-form");
    if (form) {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const data = {
          email: document.getElementById("email-input").value,
          password: document.getElementById("password-input").value,
        };

        // 1. Panggil presenter dan TUNGGU hasilnya
        const result = await this.#presenter.getLogin(data);

        // 2. PERIKSA hasil, BARU panggil loginSuccessfully (yang akan navigasi)
        if (result && result.success) {
          this.loginSuccessfully(`Selamat datang, ${result.name}!`);
        }
        // Jika gagal, presenter sudah memanggil this.loginFailed()
      });
    }
  }

  loginSuccessfully(message) {
    console.log("Login sukses:", message);
    
    // 3. Navigasi aman dilakukan di sini
    if ("startViewTransition" in document) {
      document.startViewTransition(() => {
        location.hash = "/";
      });
    } else {
      location.hash = "/";
    }
  }

  loginFailed(message) {
    alert(message || "Login gagal. Silakan coba lagi.");
  }

  // ... (sisa kode: showSubmitLoadingButton, hideSubmitLoadingButton, #addFadeInEffect) ...
  showSubmitLoadingButton() {
    document.getElementById("submit-button-container").innerHTML = `
      <button class="btn" type="submit" disabled>
        <i class="fas fa-spinner loader-button"></i> Masuk
      </button>
    `;
  }

  hideSubmitLoadingButton() {
    document.getElementById("submit-button-container").innerHTML = `
      <button class="btn" type="submit">Masuk</button>
    `;
  }

  #addFadeInEffect() {
    const container = document.querySelector(".login-container");
    if (container) {
      container.classList.add("fade-in");
    }
  }
}