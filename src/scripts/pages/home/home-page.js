import HomePresenter from "./home-presenter";
import * as ApiService from "../../data/api";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { bookmarkDb } from '../../utils/db';

export default class HomePage {
  #presenter = null;
  #map = null;
  #markers = [];
  #currentPage = 1;
  #storiesPerLoad = 15;
  #isLoading = false;
  #blobUrls = []; 
  #allStories = new Map(); // <-- 2. TAMBAHKAN PROPERTI INI

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
      // Panggil fungsi presenter yang sudah diubah
      await this.#presenter.showInitialStories(this.#storiesPerLoad);
      
      this.#setupLoadMoreButton();
      this.#setupBookmarkButtonListener();
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

  // --- Buat Fungsi Helper Baru Untuk Render Item ---
  #renderStoryItemHTML(story, isPending = false, index = -1) {
    let imageUrl, name, description, createdAt, locationHtml, storyClass, pendingBadge, tabIndex;
    let bookmarkButtonHtml = ''; // <-- 4. Siapkan HTML untuk tombol

    const currentUserId = String(localStorage.getItem("user_id"));

    if (isPending) {
      // --- Logika untuk PENDING STORY ---
      // Buat URL sementara untuk gambar dari File object
      imageUrl = URL.createObjectURL(story.photo);
      this.#blobUrls.push(imageUrl); // Simpan untuk dibersihkan nanti

      name = "Cerita Tertunda";
      description = story.description;
      createdAt = new Date().toLocaleString("id-ID", {
        dateStyle: "medium", timeStyle: "short"
      });
      locationHtml = (story.lat && story.lon) ? `<p><strong>Lokasi:</strong> ${story.lat}, ${story.lon}</p>` : "";
      storyClass = "story-item pending-story";
      pendingBadge = `<span class="pending-badge">Menunggu Sinkronisasi</span>`;
      // Beri ID 'first-story' jika ini item pertama
      tabIndex = index === 0 ? 'id="first-story" tabindex="0"' : '';
    } else {
      // 5. SIMPAN CERITA KE MAP
      this.#allStories.set(story.id, story);

      // --- Logika untuk SYNCED STORY ---
      const storyUserId = String(story.userId || (story.user && story.user.id));
      const isCurrentUser = storyUserId === currentUserId;

      imageUrl = story.photoUrl || '/favicon.png';
      name = story.name || "Nama tidak tersedia";
      description = story.description || "Deskripsi tidak tersedia";
      createdAt = new Date(story.createdAt).toLocaleString("id-ID", {
        dateStyle: "full", timeStyle: "short"
      });
      locationHtml = (story.lat && story.lon) ? `<p><strong>Lokasi:</strong> ${story.lat}, ${story.lon}</p>` : "";
      storyClass = `story-item ${isCurrentUser ? "my-story" : "other-story"}`;
      pendingBadge = "";
      // Beri ID 'first-story' hanya jika index 0 (dan tidak ada pending)
      tabIndex = index === 0 ? 'id="first-story" tabindex="0"' : '';

      // 6. TAMBAHKAN CONTAINER UNTUK TOMBOL BOOKMARK
      bookmarkButtonHtml = `
        <div class="bookmark-button-container" data-story-id="${story.id}" style="margin-top: 10px;">
          </div>
      `;
    }

    return `
      <div 
        class="${storyClass}"
        ${tabIndex}
        data-story-id="${story.id || 'pending-' + index}"
      >
        ${pendingBadge}
        <img src="${imageUrl}" alt="Foto cerita" class="story-image">
        <h3>${name}</h3>
        <p>${description}</p>
        <p><strong>Dibuat pada:</strong> ${createdAt}</p>
        ${locationHtml}
        ${bookmarkButtonHtml}
      </div>`;
  }

  // --- Ubah Fungsi showStories ---
  async showStories(stories, pendingStories = []) {
    const container = document.getElementById("stories-list");

    // Bersihkan blob URL lama (jika ada) untuk mencegah memory leak
    if (this.#blobUrls.length > 0) {
      this.#blobUrls.forEach(url => URL.revokeObjectURL(url));
      this.#blobUrls = [];
    }
    
    // Bersihkan marker lama
    this.#markers.forEach((marker) => marker.remove());
    this.#markers = [];

    if ((!stories || stories.length === 0) && (!pendingStories || pendingStories.length === 0)) {
      container.innerHTML = "<p>Tidak ada story tersedia.</p>";
      return;
    }

    // Render HTML: Pending dulu, baru synced
    const pendingHtml = pendingStories.map((story, index) => {
      return this.#renderStoryItemHTML(story, true, index);
    }).join("");
    
    const syncedHtml = stories.map((story, index) => {
      // Beri 'first-story' ke item synced pertama HANYA JIKA tidak ada pending story
      const storyIndex = pendingStories.length === 0 ? index : -1;
      return this.#renderStoryItemHTML(story, false, storyIndex);
    }).join("");

    container.innerHTML = pendingHtml + syncedHtml;

    // --- Logika Marker ---
    
    // Tambahkan marker untuk cerita yang sudah sync
    stories.forEach((story) => {
      const latitude = story.lat || (story.location && story.location.latitude);
      const longitude =
        story.lon || (story.location && story.location.longitude);
      const storyUserId = String(story.userId || (story.user && story.user.id));
      const isCurrentUser = String(localStorage.getItem("user_id")) === storyUserId;

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

    // Tambahkan marker untuk cerita pending
    pendingStories.forEach((story) => {
      if (story.lat && story.lon) {
        this.#addMarker({
          coordinate: [parseFloat(story.lat), parseFloat(story.lon)],
          title: "Cerita Tertunda",
          description: story.description,
          photoUrl: null, // Tidak ada URL foto, hanya blob lokal
          isCurrentUser: true, // Asumsikan cerita pending adalah milik user
          id: story.id,
        });
      }
    });

    if (this.#markers.length > 0) {
      const group = L.featureGroup(this.#markers);
      this.#map.fitBounds(group.getBounds());
    }

    await this.#renderBookmarkButtons(); // <-- 9. RENDER TOMBOL BOOKMARK

    // --- Logika Tombol "Load More" ---
    const loadMoreContainer = document.getElementById("load-more-container");
    if (stories.length < this.#storiesPerLoad) {
      loadMoreContainer.innerHTML = "";
    } else {
      loadMoreContainer.innerHTML = `<button id="load-more-btn" class="btn">Muat ${this.#storiesPerLoad} Cerita Lainnya</button>`;
    }
  }

  // --- Ubah Fungsi appendStories ---
  async appendStories(newStories) {
    const container = document.getElementById("stories-list");
    const currentUserId = String(localStorage.getItem("user_id"));

    if (!newStories || newStories.length === 0) {
      document.getElementById("load-more-container").innerHTML = "";
      return;
    }

    // Gunakan helper baru untuk render
    container.insertAdjacentHTML(
      "beforeend",
      newStories
        .map((story) => this.#renderStoryItemHTML(story, false, -1)) // index -1 karena bukan item pertama
        .join("")
    );

    // Tambahkan marker HANYA untuk cerita baru
    newStories.forEach((story) => {
      const latitude = story.lat || (story.location && story.location.latitude);
      const longitude =
        story.lon || (story.location && story.location.longitude);
      const storyUserId = String(story.userId || (story.user && story.user.id));
      const isCurrentUser = currentUserId === storyUserId;

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

    // 10. RENDER TOMBOL BOOKMARK HANYA UNTUK ITEM BARU
    await this.#renderBookmarkButtons(newStories.map(s => s.id));

    if (newStories.length < this.#storiesPerLoad) {
      document.getElementById("load-more-container").innerHTML = "";
    }
  }

  // 11. TAMBAHKAN FUNGSI BARU UNTUK LISTENER BOOKMARK
  #setupBookmarkButtonListener() {
    const storyList = document.getElementById("stories-list");
    storyList.addEventListener("click", async (event) => {
      const button = event.target.closest(".bookmark-btn");
      if (!button) return;

      event.preventDefault();
      const storyId = button.dataset.storyId;
      const story = this.#allStories.get(storyId);
      if (!story) return;

      const isBookmarked = button.dataset.bookmarked === 'true';

      if (isBookmarked) {
        await bookmarkDb.delete(storyId);
        button.textContent = "Bookmark";
        button.dataset.bookmarked = "false";
        button.classList.add("btn-outline");
      } else {
        await bookmarkDb.put(story);
        button.textContent = "Bookmarked";
        button.dataset.bookmarked = "true";
        button.classList.remove("btn-outline");
      }
    });
  }

  // 12. TAMBAHKAN FUNGSI BARU UNTUK MERENDER TOMBOL
  async #renderBookmarkButtons(storyIds = null) {
    const bookmarks = await bookmarkDb.getAll();
    const bookmarkedIds = new Set(bookmarks.map(b => b.id));

    let containers;
    if (storyIds) {
      // Hanya update container untuk storyId yang baru
      containers = storyIds.map(id =>
        document.querySelector(`.bookmark-button-container[data-story-id="${id}"]`)
      ).filter(Boolean);
    } else {
      // Update semua container
      containers = document.querySelectorAll(".bookmark-button-container");
    }

    containers.forEach(container => {
      const storyId = container.dataset.storyId;
      if (!storyId) {
        container.innerHTML = "";
        return;
      }

      const isBookmarked = bookmarkedIds.has(storyId);
      container.innerHTML = `
        <button
          class="btn bookmark-btn ${isBookmarked ? '' : 'btn-outline'}"
          data-story-id="${storyId}"
          data-bookmarked="${isBookmarked}"
        >
          ${isBookmarked ? 'Bookmarked' : 'Bookmark'}
        </button>
      `;
    });
  }

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
    coordinate,
    title,
    description,
    photoUrl = null,
    isCurrentUser = false,
    id = null,
  }) {
    const icon = L.icon({
      iconUrl: isCurrentUser
        ? "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png"
        : "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    });

    const popupContent = `
      <div class="marker-popup" style="max-width: 200px;">
        <h4 class="marker-title" style="margin: 0 0 8px 0; color: ${
          isCurrentUser ? "#2563eb" : "#dc2626"
        }">${title}</h4>
        ${
          photoUrl
            ? `<img src="${photoUrl}" alt="Foto cerita" style="width: 100%; border-radius: 4px; margin: 8px 0;" />`
            : ""
        }
        <p style="margin: 8px 0;">${description}</p>
        <p style="margin: 4px 0; font-size: 0.875rem; color: ${
          isCurrentUser ? "#2563eb" : "#dc2626"
        }">
          <strong>${isCurrentUser ? "Story Saya" : "Story User"}</strong>
        </p>
      </div>
    `;

    const marker = L.marker(coordinate, { icon })
      .bindPopup(popupContent)
      .addTo(this.#map);

    if (id) {
      marker.storyId = id;
    }

    this.#markers.push(marker);

    return marker;
  }

  showError(message) {
    const container = document.getElementById("stories-list");
    container.innerHTML = `<p class="error-message">Error: ${message}</p>`;

    if (message.includes("401") || message.includes("unauthorized")) {
      localStorage.removeItem("access_token");
      setTimeout(() => {
        window.location.hash = "/login";
      }, 2000);
    }
  }

  #addFadeInEffect() {
    const container = document.querySelector(".container");
    if (container) {
      container.classList.add("fade-in");
    }
  }
}