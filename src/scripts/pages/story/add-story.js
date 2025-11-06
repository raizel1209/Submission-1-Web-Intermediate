import AddStoryPresenter from "./addStory-presenter";
import * as ApiService from "../../data/api";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default class AddStory {
  #presenter = null;
  #form = null;
  #stream = null;
  #map = null;

  async render() {
    const token = localStorage.getItem("access_token");

    if (!token) {
      return `
        <section class="container">
          <h1>Tambah Cerita</h1>
          <p>Silakan login terlebih dahulu untuk mengakses fitur ini.</p>
        </section>
      `;
    }

    return `
      <a href="#main-content" class="skip-to-content" id="skip-to-content-link">Skip to main content</a>
      <section class="container fade-in" id="main-content" tabindex="-1">
        <h1>Tambah Cerita Baru</h1>
        <form id="add-story-form" enctype="multipart/form-data">
          <div class="form-control">
            <label for="description">Deskripsi</label>
            <textarea id="description" name="description" placeholder="Tulis cerita Anda..." required></textarea>
          </div>

          <div class="form-control">
            <label>Ambil Gambar dari Kamera:</label><br>
            <video id="camera-stream" autoplay playsinline width="100%" aria-label="Stream kamera untuk mengambil foto"></video>
            <button type="button" id="capture-btn" class="btn">Ambil Foto</button>
            <canvas id="photo-canvas" style="display:none;" aria-label="Canvas untuk menampilkan foto hasil tangkapan kamera"></canvas>

            <label for="photo">Atau pilih foto dari perangkat:</label>
            <input type="file" id="photo" name="photo" accept="image/jpeg,image/png" required />
          </div>

          <div class="form-control">
            <label>
              <input type="checkbox" id="use-location" name="useLocation">
              Gunakan Lokasi Otomatis (GPS)
            </label>
          </div>

          <div class="form-control">
            <label>Pilih Lokasi Manual (Opsional):</label>
            <div id="map" style="height: 300px;"></div>
            <input type="hidden" id="lat" name="lat" />
            <input type="hidden" id="lon" name="lon" />
          </div>

          <div class="form-buttons">
            <span id="submit-button-container">
              <button type="submit" class="btn">Kirim Cerita</button>
            </span>
          </div>
        </form>
      </section>
    `;
  }

  async afterRender() {
    const token = localStorage.getItem("access_token");
    if (!token) {
      window.location.hash = "/login";
      return;
    }

    this.#presenter = new AddStoryPresenter({ view: this, model: ApiService });
    this.#form = document.getElementById("add-story-form");

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

    this.#setupCamera();
    this.#setupMap();
    this.#addFadeInEffect();

    this.#form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const description = this.#form.description.value.trim();
      const imageFile = this.#form.photo.files[0];
      const useLocation = this.#form.useLocation.checked;

      if (!description || !imageFile) {
        alert("Deskripsi dan foto wajib diisi.");
        return;
      }

      if (imageFile.size > 1_000_000) {
        alert("Ukuran foto melebihi 1MB.");
        return;
      }

      let lat = document.getElementById("lat").value;
      let lon = document.getElementById("lon").value;

      if (useLocation && (!lat || !lon)) {
        try {
          const position = await this.#getCurrentLocation();
          lat = position.coords.latitude;
          lon = position.coords.longitude;
        } catch {
          alert("Gagal mendapatkan lokasi otomatis.");
        }
      }

      const formData = new FormData();
      formData.append("description", description);
      formData.append("photo", imageFile);
      if (lat && lon) {
        formData.append("lat", lat);
        formData.append("lon", lon);
      }

      await this.#presenter.submitStory(formData);
      this.#stopCamera();
    });

    window.addEventListener("beforeunload", this.#stopCamera.bind(this));
    window.addEventListener("hashchange", this.#stopCamera.bind(this));
    document.addEventListener(
      "visibilitychange",
      this.#handleVisibilityChange.bind(this)
    );

    const photoInput = document.getElementById("photo");
    if (photoInput) {
      photoInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
          const canvas = document.getElementById("photo-canvas");
          const ctx = canvas.getContext("2d");
          const img = new Image();
          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            canvas.style.display = "block";
          };
          img.src = URL.createObjectURL(file);
        }
      });
    }
  }

  #setupCamera() {
    const video = document.getElementById("camera-stream");
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        this.#stream = stream;
        video.srcObject = stream;
      })
      .catch(() => {
        alert("Kamera tidak tersedia. Izinkan akses kamera di browser.");
      });

    document.getElementById("capture-btn").addEventListener("click", () => {
      const canvas = document.getElementById("photo-canvas");
      canvas.style.display = "block";
      const ctx = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob.size > 1_000_000) {
            alert("Ukuran foto melebihi 1MB.");
            return;
          }
          const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
          const dt = new DataTransfer();
          dt.items.add(file);
          document.getElementById("photo").files = dt.files;
        },
        "image/jpeg",
        0.8
      );
    });
  }

  #setupMap() {
    this.#map = L.map("map").setView([-6.2, 106.8], 13);
    L.tileLayer("https://tile.openstreetmap.de/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(this.#map);

    const icon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    let marker;
    this.#map.on("click", (e) => {
      if (marker) this.#map.removeLayer(marker);
      marker = L.marker(e.latlng, { icon })
        .addTo(this.#map)
        .bindPopup(
          `Lokasi dipilih:<br>Lat: ${e.latlng.lat.toFixed(
            5
          )}, Lon: ${e.latlng.lng.toFixed(5)}`
        )
        .openPopup();

      document.getElementById("lat").value = e.latlng.lat;
      document.getElementById("lon").value = e.latlng.lng;
    });
  }

  #getCurrentLocation() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  }

  #stopCamera() {
    if (this.#stream) {
      this.#stream.getTracks().forEach((track) => track.stop());
      this.#stream = null;
    }
  }

  #handleVisibilityChange() {
    if (document.hidden) {
      this.#stopCamera();
    }
  }

  #addFadeInEffect() {
    const container = document.querySelector(".container");
    container.classList.add("fade-in");
  }

  showSubmitSuccess(message) {
    alert(`Cerita berhasil disimpan: ${message}`);
    this.#form.reset();

    if ("startViewTransition" in document) {
      document.startViewTransition(() => {
        location.hash = "/";
      });
    } else {
      location.hash = "/";
    }
  }

  showSubmitError(message) {
    alert(`Terjadi kesalahan saat mengirim cerita: ${message}`);
    this.hideSubmitLoadingButton();
  }

  showSubmitLoadingButton() {
    document.getElementById("submit-button-container").innerHTML = `
      <button type="submit" class="btn" disabled>
        <i class="fas fa-spinner loader-button"></i> Mengirim...
      </button>
    `;
  }

  hideSubmitLoadingButton() {
    document.getElementById("submit-button-container").innerHTML = `
      <button type="submit" class="btn">Kirim Cerita</button>
    `;
  }
}
