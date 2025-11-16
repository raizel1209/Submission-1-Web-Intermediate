import { bookmarkDb } from '../../utils/db';
import { getAccessToken } from '../../utils/auth';

export default class BookmarkPage {
  async render() {
    return `
      <a href="#main-content" class="skip-to-content" id="skip-to-content-link">Skip to main content</a>
      <section class="container fade-in" id="main-content" tabindex="-1">
        <h1>Cerita Tersimpan (Bookmarks)</h1>
        <div id="bookmarked-stories-list" style="margin-top: 20px;">Memuat cerita...</div>
      </section>
    `;
  }

  async afterRender() {
    // Cek login
    if (!getAccessToken()) {
      window.location.hash = "/login";
      return;
    }

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

    await this.#loadBookmarkedStories();
    this.#setupRemoveButtonListener();
  }

  async #loadBookmarkedStories() {
    const container = document.getElementById("bookmarked-stories-list");
    const stories = await bookmarkDb.getAll();

    if (!stories || stories.length === 0) {
      container.innerHTML = "<p>Anda belum menyimpan cerita apapun.</p>";
      return;
    }

    container.innerHTML = stories.map(story => this.#renderStoryItemHTML(story)).join("");
  }

  #renderStoryItemHTML(story) {
    const imageUrl = story.photoUrl || '/favicon.png';
    const name = story.name || "Nama tidak tersedia";
    const description = story.description || "Deskripsi tidak tersedia";
    const createdAt = new Date(story.createdAt).toLocaleString("id-ID", {
      dateStyle: "full", timeStyle: "short"
    });
    const locationHtml = (story.lat && story.lon) ? `<p><strong>Lokasi:</strong> ${story.lat}, ${story.lon}</p>` : "";

    return `
      <div class="story-item" data-story-id="${story.id}">
        <img src="${imageUrl}" alt="Foto cerita" class="story-image">
        <h3>${name}</h3>
        <p>${description}</p>
        <p><strong>Dibuat pada:</strong> ${createdAt}</p>
        ${locationHtml}
        <div class="bookmark-button-container" style="margin-top: 10px;">
          <button class="btn remove-bookmark-btn" data-story-id="${story.id}">
            Hapus Bookmark
          </button>
        </div>
      </div>`;
  }

  #setupRemoveButtonListener() {
    const container = document.getElementById("bookmarked-stories-list");
    container.addEventListener("click", async (event) => {
      if (event.target.classList.contains("remove-bookmark-btn")) {
        event.preventDefault();
        const storyId = event.target.dataset.storyId;
        
        if (confirm("Anda yakin ingin menghapus bookmark ini?")) {
          await bookmarkDb.delete(storyId);
          alert("Bookmark dihapus!");
          await this.#loadBookmarkedStories(); // Muat ulang daftar
        }
      }
    });
  }
}