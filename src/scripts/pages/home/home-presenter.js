export default class HomePresenter {
  #view = null;
  #model = null;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  async showStories() {
    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        this.#view.showError("tolong login dahulu");
        window.location.hash = "/login";
        return;
      }

      const response = await this.#model.getAllStories({
        token,
        page: 1,
        size: 5,
      });

      if (response.error) {
        throw new Error(response.message);
      }

      if (response.listStory) {
        this.#view.showStories(response.listStory);
      } else {
        this.#view.showError("Tidak ada data story yang ditemukan");
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
