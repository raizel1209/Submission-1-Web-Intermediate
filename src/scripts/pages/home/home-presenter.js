import { storyDb, syncDb } from '../../utils/db'; // <-- 1. IMPORT syncDb

export default class HomePresenter {
  #view = null;
  #model = null;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  // Ganti nama fungsi ini dari showStories menjadi showInitialStories
  async showInitialStories(size) {
    try {
      // 2. Ambil data pending DARI syncDb
      const pendingStories = await syncDb.getAll();

      // 3. Ambil data cache DARI storyDb
      const cachedStories = await storyDb.getAll();
      if (cachedStories.length > 0 || pendingStories.length > 0) {
        // 4. Kirim KEDUA data ke view untuk tampilan instan
        this.#view.showStories(cachedStories, pendingStories);
      }

      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("Token tidak ditemukan. Silakan login ulang.");
      }

      // 5. Perbaiki API call: Tambahkan 'location: 1'
      const response = await this.#model.getAllStories({
        token,
        page: 1,
        size: size,
        location: 1, // <-- TAMBAHKAN INI UNTUK MENDAPATKAN DATA PETA
      });

      if (response.error) throw new Error(response.message);

      if (response.listStory) {
        await storyDb.putAll(response.listStory);
        // 6. Kirim data network + data pending ke view
        this.#view.showStories(response.listStory, pendingStories);
      } else {
        // 7. Cek semua sumber sebelum tampil error
        if (cachedStories.length === 0 && pendingStories.length === 0) {
          this.#view.showError("Tidak ada data story yang ditemukan");
        }
      }
    } catch (error) {
      this.#view.showError(error.message);

      if (
        error.message.includes("401") ||
        error.message.includes("unauthorized")
      ) {
        localStorage.removeItem("access_token");
        window.location.hash = "/login";
      }
    }
  }

  // Fungsi ini mengambil data untuk "load more"
  async fetchMoreStories(page, size) {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("Token tidak ditemukan. Silakan login ulang.");
      }

      // 8. Perbaiki API call: Tambahkan 'location: 1'
      const response = await this.#model.getAllStories({
        token,
        page: page,
        size: size,
        location: 1, // <-- TAMBAHKAN INI JUGA
      });

      if (response.error) throw new Error(response.message);

      if (response.listStory) {
        this.#view.appendStories(response.listStory);
      }
    } catch (error) {
      this.#view.showError(error.message);
    }
  }
}