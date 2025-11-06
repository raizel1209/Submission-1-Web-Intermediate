import HomePresenter from "./home-presenter";
import * as ApiService from "../../data/api";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default class HomePage {
  #presenter = null;
  #map = null;
  #markers = [];
  #currentPage = 1;
  #storiesPerLoad = 15;
  #isLoading = false;

  async render() {
    const token = localStorage.getItem("access_token");

    const skipLink = `<a href="#main-content" class="skip-to-content" id="skip-to-content-link">Skip to main content</a>`;

    if (!token) {
      return `
        ${skipLink}
        <section class="container fade-in" id="main-content" tabindex="-1">
          <h1>Home Page</h1>
          <p>tolong login dahulu</p>
        </section>
      `;
    }

    return `
      ${skipLink}
      <section class="container fade-in" id="main-content" tabindex="-1">
        <h1>Home Page</h1>
        <div style="margin-bottom: 20px;">
          <a href="#/add-story" class="btn">Tambah Cerita Baru</a>
        </div>
        <div id="map" style="height: 400px; margin-bottom: 20px;"></div>
        <div id="stories-list">Loading stories...</div>
        
        <div id="load-more-container" style="margin-top: 20px;"></div>
      </section>
    `;
  }

  async afterRender() {
    const token = localStorage.getItem("access_token");

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

    if (!token) {
      window.location.hash = "/login";
      return;
    }

    try {
      this.#presenter = new HomePresenter({
        view: this,
        model: ApiService,
      });

      await this.initialMap();
      await this.#presenter.showInitialStories(this.#storiesPerLoad);
      this.#setupLoadMoreButton();
      this.#addFadeInEffect();
    } catch (error) {
      this.showError(error.message);
    }
  }

  async initialMap() {
    this.#map = L.map("map").setView([-2.5489, 118.0149], 5);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(this.#map);

    this.#map.on("click", (e) => {
      const coordinate = e.latlng;
      this.#addMarker({
        coordinate: [coordinate.lat, coordinate.lng],
        title: "Lokasi Baru",
        description: "Lokasi dipilih!",
        isCurrentUser: true,
      });
    });
  }

  showStories(stories) {
    const container = document.getElementById("stories-list");
    const currentUserId = String(localStorage.getItem("user_id"));

    // Hapus marker lama
    this.#markers.forEach((marker) => marker.remove());
    this.#markers = [];

    if (!stories || stories.length === 0) {
      container.innerHTML = "<p>Tidak ada story tersedia.</p>";
      return;
    }

    // Render HTML baru (menggantikan)
    container.innerHTML = stories
      .map((story, index) => {
        // ... (logika HTML map Anda tetap sama) ...
        const storyUserId = String(
          story.userId || (story.user && story.user.id)
        );
        const isCurrentUser = storyUserId === currentUserId;

        return `
          <div 
            class="story-item ${isCurrentUser ? "my-story" : "other-story"}"
            ${index === 0 ? 'id="first-story" tabindex="0"' : ""}
            data-story-id="${story.id}"
          >
            <img src="${story.photoUrl || '/favicon.png'}" alt="Foto cerita" class="story-image">
            <h3>${story.name || "Nama tidak tersedia"}</h3>
            <p>${story.description || "Deskripsi tidak tersedia"}</p>
            <p><strong>Dibuat pada:</strong> ${new Date(
              story.createdAt
            ).toLocaleString("id-ID", {
              dateStyle: "full",
              timeStyle: "short",
            })}</p>
            ${
              story.lat && story.lon
                ? `<p><strong>Lokasi:</strong> ${story.lat}, ${story.lon}</p>`
                : ""
            }
          </div>`;
      })
      .join("");

    // Tambahkan marker baru
    stories.forEach((story) => {
      // ... (logika marker Anda tetap sama) ...
      const latitude = story.lat || (story.location && story.location.latitude);
      const longitude =
        story.lon || (story.location && story.location.longitude);
      const storyUserId = String(story.userId || (story.user && story.user.id));
      const isCurrentUser = storyUserId === currentUserId;

      if (latitude && longitude) {
        this.#addMarker({
          coordinate: [parseFloat(latitude), parseFloat(longitude)],
          title: story.name || "Tidak ada judul",
          description: story.description || "Tidak ada deskripsi",
          photoUrl: story.photoUrl,
          isCurrentUser,
          id: story.id,
        });
      }
    });

    if (this.#markers.length > 0) {
      const group = L.featureGroup(this.#markers);
      this.#map.fitBounds(group.getBounds());
    }

    // 6. TAMPILKAN ATAU SEMBUNYIKAN TOMBOL BERDASARKAN HASIL
    const loadMoreContainer = document.getElementById("load-more-container");
    if (stories.length < this.#storiesPerLoad) {
      loadMoreContainer.innerHTML = ""; // Sembunyikan jika cerita < 15
    } else {
      loadMoreContainer.innerHTML = `<button id="load-more-btn" class="btn">Muat ${this.#storiesPerLoad} Cerita Lainnya</button>`;
    }
  }

  // 7. TAMBAHKAN FUNGSI BARU "appendStories" (UNTUK LOAD MORE)
  appendStories(newStories) {
    const container = document.getElementById("stories-list");
    const currentUserId = String(localStorage.getItem("user_id"));

    if (!newStories || newStories.length === 0) {
      // Jika tidak ada cerita baru, sembunyikan tombol
      document.getElementById("load-more-container").innerHTML = "";
      return;
    }

    // Render HTML baru (menambahkan)
    container.insertAdjacentHTML(
      "beforeend",
      newStories
        .map((story) => {
          const storyUserId = String(
            story.userId || (story.user && story.user.id)
          );
          const isCurrentUser = storyUserId === currentUserId;

          return `
          <div 
            class="story-item ${isCurrentUser ? "my-story" : "other-story"}"
            data-story-id="${story.id}"
          >
            <img src="${story.photoUrl || '/favicon.png'}" alt="Foto cerita" class="story-image">
            <h3>${story.name || "Nama tidak tersedia"}</h3>
            <p>${story.description || "Deskripsi tidak tersedia"}</p>
            <p><strong>Dibuat pada:</strong> ${new Date(
              story.createdAt
            ).toLocaleString("id-ID", {
              dateStyle: "full",
              timeStyle: "short",
            })}</p>
            ${
              story.lat && story.lon
                ? `<p><strong>Lokasi:</strong> ${story.lat}, ${story.lon}</p>`
                : ""
            }
          </div>`;
        })
        .join("")
    );

    // Tambahkan marker HANYA untuk cerita baru
    newStories.forEach((story) => {
      const latitude = story.lat || (story.location && story.location.latitude);
      const longitude =
        story.lon || (story.location && story.location.longitude);
      const storyUserId = String(story.userId || (story.user && story.user.id));
      const isCurrentUser = storyUserId === currentUserId;

      if (latitude && longitude) {
        this.#addMarker({
          coordinate: [parseFloat(latitude), parseFloat(longitude)],
          title: story.name || "Tidak ada judul",
          description: story.description || "Tidak ada deskripsi",
          photoUrl: story.photoUrl,
          isCurrentUser,
          id: story.id,
        });
      }
    });

    // Cek apakah ini halaman terakhir
    if (newStories.length < this.#storiesPerLoad) {
      document.getElementById("load-more-container").innerHTML = ""; // Sembunyikan tombol
    }
  }

  // 8. TAMBAHKAN FUNGSI UNTUK SETUP TOMBOL
  #setupLoadMoreButton() {
    const container = document.getElementById("load-more-container");

    container.addEventListener("click", async (event) => {
      if (event.target.id !== "load-more-btn" || this.#isLoading) return;

      this.#isLoading = true;
      this.#showLoadMoreLoading(true);

      this.#currentPage++;
      await this.#presenter.fetchMoreStories(
        this.#currentPage,
        this.#storiesPerLoad
      );

      this.#isLoading = false;
      this.#showLoadMoreLoading(false);
    });
  }

  // 9. TAMBAHKAN FUNGSI UNTUK UI LOADING TOMBOL
  #showLoadMoreLoading(isLoading) {
    const button = document.getElementById("load-more-btn");
    if (!button) return;

    if (isLoading) {
      button.textContent = "Memuat...";
      button.disabled = true;
    } else {
      button.textContent = `Muat ${this.#storiesPerLoad} Cerita Lainnya`;
      button.disabled = false;
    }
  }

  #addMarker({
    // ... (fungsi #addMarker Anda tetap sama) ...
  }) {
    // ...
  }

  showError(message) {
    // ... (fungsi showError Anda tetap sama) ...
  }

  #addFadeInEffect() {
    // ... (fungsi #addFadeInEffect Anda tetap sama) ...
  }
}