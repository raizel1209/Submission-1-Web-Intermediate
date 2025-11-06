import { storyDb } from '../../utils/db';
export default class HomePresenter {
  #view = null;
  #model = null;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  async showStories() {
    try {
      const cachedStories = await storyDb.getAll();
      if (cachedStories.length > 0) {
        this.#view.showStories(cachedStories);
      }

      // 2. Tetap fetch dari network
      const token = localStorage.getItem("access_token");
      if (!token) {
        // ... (handling token) ...
      }

      const response = await this.#model.getAllStories({
        token, page: 1, size: 20, // Ambil lebih banyak untuk cache
      });

      if (response.error) throw new Error(response.message);

      if (response.listStory) {
        // 3. (Write) Simpan data baru ke IndexedDB
        await storyDb.putAll(response.listStory);
        // 4. Tampilkan data baru dari network
        this.#view.showStories(response.listStory);
      } else {
        if (cachedStories.length === 0) { // Hanya error jika cache juga kosong
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
}
