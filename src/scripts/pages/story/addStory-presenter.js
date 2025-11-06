export default class AddStoryPresenter {
  #view;
  #model;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  async submitStory(formData) {
    this.#view.showSubmitLoadingButton();

    try {
      const token = localStorage.getItem("access_token");
      if (!token)
        throw new Error("Token tidak ditemukan. Silakan login ulang.");

      const response = await this.#model.addStory(token, formData);

      if (response.error) {
        throw new Error(response.message || "Gagal mengirim cerita.");
      }

      this.#view.showSubmitSuccess(
        response.message || "Cerita berhasil dikirim."
      );
    } catch (error) {
      this.#view.showSubmitError(error.message);
    } finally {
      this.#view.hideSubmitLoadingButton();
    }
  }
}
