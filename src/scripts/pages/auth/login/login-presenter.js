import { storyDb } from '../../../utils/db'; // Pastikan path ini benar

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
        return { success: false }; // <-- 1. Kembalikan status gagal
      }

      const { token, name } = response.loginResult;

      // Simpan token di localStorage
      this.#authModel.putAccessToken(token);

      // 2. TUNGGU operasi IndexedDB selesai
      await storyDb.put({ id: 'user-token', token: token });

      // 3. Hapus pemanggilan view.loginSuccessfully() dari sini
      // this.#view.loginSuccessfully(`Selamat datang, ${name}!`); 
      
      // 4. Kembalikan status sukses dan data
      return { success: true, name: name };

    } catch (error) {
      console.error("getLogin: error:", error);
      this.#view.loginFailed(error.message);
      return { success: false }; // <-- 5. Kembalikan status gagal
    } finally {
      this.#view.hideSubmitLoadingButton();
    }
  }
}