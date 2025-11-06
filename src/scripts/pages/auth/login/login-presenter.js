export default class LoginPresenter {
  #view;
  #model;
  #authModel;

  constructor({ view, model, authModel }) {
    this.#view = view;
    this.#model = model;
    this.#authModel = authModel;
  }

  async getLogin({ email, password }) {
    this.#view.showSubmitLoadingButton();

    try {
      const response = await this.#model.loginUser({ email, password });

      if (response.error) {
        this.#view.loginFailed(response.message);
        return;
      }

      const { token, name } = response.loginResult;
      this.#authModel.putAccessToken(token);
      this.#view.loginSuccessfully(`Selamat datang, ${name}!`);
    } catch (error) {
      console.error("getLogin: error:", error);
      this.#view.loginFailed(error.message);
    } finally {
      this.#view.hideSubmitLoadingButton();
    }
  }
}
