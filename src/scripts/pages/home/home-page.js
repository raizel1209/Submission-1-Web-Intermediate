import HomePresenter from "./home-presenter";
import * as ApiService from "../../data/api";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default class HomePage {
  #presenter = null;
  #map = null;
  #markers = [];

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
      await this.#presenter.showStories();
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

    if (!stories || stories.length === 0) {
      container.innerHTML = "<p>Tidak ada story tersedia.</p>";
      return;
    }

    this.#markers.forEach((marker) => marker.remove());
    this.#markers = [];

    container.innerHTML = stories
      .map((story, index) => {
        const storyUserId = String(
          story.userId || (story.user && story.user.id)
        );
        const isCurrentUser = storyUserId === currentUserId;

        console.log(
          "StoryUserId:",
          storyUserId,
          "CurrentUserId:",
          currentUserId
        );

        return `
          <div 
            class="story-item ${isCurrentUser ? "my-story" : "other-story"}"
            ${index === 0 ? 'id="first-story" tabindex="0"' : ""}
            data-story-id="${story.id}"
          >
            <img src="${story.photoUrl}" alt="Foto cerita" class="story-image">
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

    stories.forEach((story) => {
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

    console.log(
      `Marker added: ${
        isCurrentUser ? "Current User" : "Other User"
      } at ${coordinate}`
    );

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
