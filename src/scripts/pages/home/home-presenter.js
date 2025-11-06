// src/scripts/pages/home/home-presenter.js

import { storyDb } from '../../utils/db';
export default class HomePresenter {
  #view = null;
  #model = null;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  // UBAH FUNGSI INI:
  async showInitialStories(size) {
    try {
      // 1. (Read) Coba ambil dari cache dulu
      const cachedStories = await storyDb.getAll();
      if (cachedStories.length > 0) {
        this.#view.showStories(cachedStories);
      }

      // 2. Tetap fetch dari network (hanya halaman 1)
      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("Token tidak ditemukan. Silakan login ulang.");
      }

      const response = await this.#model.getAllStories({
        token,
        page: 1, // Selalu ambil halaman 1
        size: size, // Gunakan ukuran yang diminta
      });

      if (response.error) throw new Error(response.message);

      if (response.listStory) {
        // 3. (Write) Simpan data baru ke IndexedDB
        await storyDb.putAll(response.listStory);
        // 4. Tampilkan data baru (menggantikan cache)
        this.#view.showStories(response.listStory);
      } else {
        if (cachedStories.length === 0) {
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

  // TAMBAHKAN FUNGSI BARU INI:
  async fetchMoreStories(page, size) {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("Token tidak ditemukan. Silakan login ulang.");
      }

      const response = await this.#model.getAllStories({
        token,
        page: page,
        size: size,
      });

      if (response.error) throw new Error(response.message);

      if (response.listStory) {
        // Panggil fungsi "append" baru di view
        this.#view.appendStories(response.listStory);
      }
    } catch (error) {
      this.#view.showError(error.message);
    }
  }
}