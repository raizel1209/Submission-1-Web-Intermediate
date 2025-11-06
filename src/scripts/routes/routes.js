import HomePage from "../pages/home/home-page";
import AddStory from "../pages/story/add-story";
import LoginPage from "../pages/auth/login/login-page";
import RegisterPage from "../pages/auth/register/register-page";

// Hapus import untuk checkAuthenticatedRoute dan checkUnauthenticatedRouteOnly

const routes = {
  "/": new HomePage(),
  "/add-story": new AddStory(),
  "/login": new LoginPage(),
  "/register": new RegisterPage(),
};

export default routes;