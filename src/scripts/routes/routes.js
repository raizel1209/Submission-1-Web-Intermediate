import HomePage from "../pages/home/home-page";
import AddStory from "../pages/story/add-story";
import LoginPage from "../pages/auth/login/login-page";
import RegisterPage from "../pages/auth/register/register-page";

import {
  checkAuthenticatedRoute,
  checkUnauthenticatedRouteOnly,
} from "../utils/auth";

const routes = {
  "/": checkAuthenticatedRoute(new HomePage()),
  "/add-story": checkAuthenticatedRoute(new AddStory()),
  "/login": checkUnauthenticatedRouteOnly(new LoginPage()),
  "/register": checkUnauthenticatedRouteOnly(new RegisterPage()),
};

export default routes;
