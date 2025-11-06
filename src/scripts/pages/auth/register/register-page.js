import RegisterPresenter from "./register-presenter";
import * as ApiService from "../../../data/api";

export default class RegisterPage {
  #presenter = null;

  async render() {
    return `
      <a href="#main-content" class="skip-to-content" id="skip-to-content-link">Skip to main content</a>
      <section class="register-container" id="main-content" tabindex="-1">
        <div class="register-form-container">
          <h1 class="register_title" id="register-form-title">Daftar akun</h1>

          <form id="register-form" class="register-form" aria-labelledby="register-form-title">
            <div class="form-control">
              <label for="name-input" class="register-form__name-title">Nama lengkap</label>
              <div class="register-form__title-container">
                <input 
                  id="name-input" 
                  type="text" 
                  name="name" 
                  placeholder="Masukkan nama lengkap" 
                  required
                  aria-required="true"
                  aria-describedby="name-input-help"
                />
                <span id="name-input-help" class="visually-hidden">Tulis nama lengkap Anda di sini</span>
              </div>
            </div>

            <div class="form-control">
              <label for="email-input" class="register-form__email-title">Email</label>
              <div class="register-form__title-container">
                <input 
                  id="email-input" 
                  type="email" 
                  name="email" 
                  placeholder="Contoh: nama@email.com" 
                  required
                  aria-required="true"
                  aria-describedby="email-input-help"
                />
                <span id="email-input-help" class="visually-hidden">Masukkan alamat email yang valid</span>
              </div>
            </div>

            <div class="form-control">
              <label for="password-input" class="register-form__password-title">Password</label>
              <div class="register-form__title-container">
                <input 
                  id="password-input" 
                  type="password" 
                  name="password" 
                  placeholder="Masukkan password baru" 
                  required
                  aria-required="true"
                  aria-describedby="password-input-help"
                />
                <span id="password-input-help" class="visually-hidden">Masukkan password yang kuat untuk akun Anda</span>
              </div>
            </div>

            <div class="form-buttons register-form__form-buttons">
              <div id="submit-button-container">
                <button class="btn" type="submit">Daftar akun</button>
              </div>
              <p class="register-form__already-have-account">Sudah punya akun? <a href="#/login">Masuk</a></p>
            </div>
          </form>
        </div>
      </section>
    `;
  }

  async afterRender() {
    this.#presenter = new RegisterPresenter({
      view: this,
      model: ApiService,
    });

    // Skip to Content handler
    const skipLink = document.getElementById("skip-to-content-link");
    const mainContent = document.getElementById("main-content");
    if (skipLink && mainContent) {
      skipLink.addEventListener("click", function (e) {
        e.preventDefault();
        mainContent.setAttribute("tabindex", "-1");
        mainContent.focus();
      });
    }

    this.#setupForm();
    this.addPageTransition();
  }

  addPageTransition() {
    if ("startViewTransition" in document) {
      document.startViewTransition(() => {
        const registerContainer = document.querySelector(".register-container");

        registerContainer.style.opacity = "0";

        setTimeout(() => {
          registerContainer.style.transition = "opacity 0.3s ease-in-out";
          registerContainer.style.opacity = "1";
        }, 300);
      });
    }
  }

  #setupForm() {
    document
      .getElementById("register-form")
      .addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = document.getElementById("name-input").value;
        const email = document.getElementById("email-input").value;
        const password = document.getElementById("password-input").value;

        if (!name || !email || !password) {
          alert("Semua field harus diisi!");
          return;
        }

        const data = { name, email, password };
        await this.#presenter.getRegistered(data);
      });
  }

  registeredSuccessfully(message) {
    console.log(message);
    if ("startViewTransition" in document) {
      document.startViewTransition(() => {
        location.hash = "/login";
      });
    } else {
      location.hash = "/login";
    }
  }

  registeredFailed(message) {
    alert(message);
  }

  showSubmitLoadingButton() {
    document.getElementById("submit-button-container").innerHTML = `
      <button class="btn" type="submit" disabled>
        <i class="fas fa-spinner loader-button"></i> Daftar akun
      </button>
    `;
  }

  hideSubmitLoadingButton() {
    document.getElementById("submit-button-container").innerHTML = `
      <button class="btn" type="submit">Daftar akun</button>
    `;
  }

  addPageTransition() {
    if ("startViewTransition" in document) {
      document.startViewTransition(() => {
        const container = document.querySelector(".container");

        container.style.transform = "translateX(100%)";
        container.style.opacity = "0";
        container.style.transition =
          "transform 0.4s ease-out, opacity 0.4s ease-out";

        requestAnimationFrame(() => {
          container.style.transform = "translateX(0)";
          container.style.opacity = "1";
        });
      });
    }
  }
}
