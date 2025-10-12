import axios from "axios";
export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}`,
  withCredentials: true,
});

function getCookie(name) {
  return document.cookie
    .split("; ")
    .find((r) => r.startsWith(name + "="))
    ?.split("=")[1];
}

// Añade X-CSRFToken a cada petición "unsafe"
api.interceptors.request.use((config) => {
  const csrf = getCookie("csrftoken");
  if (csrf && !config.headers["X-CSRFToken"]) {
    config.headers["X-CSRFToken"] = csrf;
  }
  return config;
});

export const getCsrf = () => api.get("/auth/csrf");
export const login = (username, password) =>
  api.post("/auth/login", { username, password });
export const logout = () => api.post("/auth/logout");
export const me = async () => (await api.get("/auth/me")).data;
export const register = (username, password) =>
  api.post("/auth/register", { username, password });
