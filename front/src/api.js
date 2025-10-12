import axios from "axios";

// Axios instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // ✅ necesario para cookies de sesión y CSRF
  headers: {
    "Content-Type": "application/json",
  },
});

// Función para leer la cookie CSRF
function getCookie(name) {
  return document.cookie
    .split("; ")
    .find((r) => r.startsWith(name + "="))
    ?.split("=")[1];
}

// Interceptor para añadir X-CSRFToken a las peticiones "unsafe"
api.interceptors.request.use((config) => {
  const csrf = getCookie("csrftoken");
  if (csrf && !config.headers["X-CSRFToken"]) {
    config.headers["X-CSRFToken"] = csrf;
  }
  return config;
});

// -----------------------------------
// Funciones de API
// -----------------------------------

// 1️⃣ Obtener CSRF cookie (debe llamarse antes de POST/PUT/DELETE)
export const getCsrf = () => api.get("/auth/csrf");

// 2️⃣ Login (llama primero a getCsrf)
export const login = async (username, password) => {
  await getCsrf(); // 🔥 asegura que csrftoken exista
  const res = await api.post("/auth/login", { username, password });
  return res.data;
};

// 3️⃣ Logout
export const logout = async () => {
  const res = await api.post("/auth/logout");
  return res.data;
};

// 4️⃣ Obtener info del usuario logueado
export const me = async () => {
  const res = await api.get("/auth/me");
  return res.data;
};

// 5️⃣ Register (también llama a getCsrf antes)
export const register = async (username, password) => {
  await getCsrf();
  const res = await api.post("/auth/register", { username, password });
  return res.data;
};
