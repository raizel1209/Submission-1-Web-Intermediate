import CONFIG from "../config";

const ENDPOINTS = {
  REGISTER: `${CONFIG.BASE_URL}/register`,
  LOGIN: `${CONFIG.BASE_URL}/login`,
  STORIES: `${CONFIG.BASE_URL}/stories`,
};

export async function registerUser({ name, email, password }) {
  try {
    const response = await fetch(ENDPOINTS.REGISTER, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Register failed");
    return data;
  } catch (error) {
    return { error: true, message: error.message };
  }
}

export async function loginUser({ email, password }) {
  try {
    const response = await fetch(ENDPOINTS.LOGIN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Login failed");

    if (data.loginResult && data.loginResult.token) {
      localStorage.setItem("access_token", data.loginResult.token);
    } else {
      throw new Error("Token not found in response");
    }

    return data;
  } catch (error) {
    return { error: true, message: error.message };
  }
}

export async function getAllStories({ token, page, size, location = 0 }) {
  try {
    if (!token) {
      throw new Error("Token is required");
    }

    const url = new URL(ENDPOINTS.STORIES);
    const params = new URLSearchParams();

    if (page !== undefined) params.append("page", page);
    if (size !== undefined) params.append("size", size);
    if (location !== undefined) params.append("location", location);

    url.search = params.toString();

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch stories");
    }

    return data;
  } catch (error) {
    return { error: true, message: error.message };
  }
}

export async function addStory(token, formData) {
  try {
    const response = await fetch(ENDPOINTS.STORIES, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to add story");
    }

    return data;
  } catch (error) {
    return { error: true, message: error.message };
  }
}
