import axios from "axios";

// Axios instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // ✅ necesario para cookies de sesión y CSRF
  headers: {
    "Content-Type": "application/json",
  },
});

// -----------------------------------
// Funciones de API
// -----------------------------------

// 1️⃣ Obtener CSRF cookie (debe llamarse antes de POST/PUT/DELETE)
export const getCsrf = async () => {
  const { data } = await api.get("/auth/csrf");      // ← el backend devuelve { csrfToken: "..." }
  api.defaults.headers.common["X-CSRFToken"] = data.csrfToken; // ← guardamos el header por defecto
  return data.csrfToken;
};

// 1.5️⃣ Helper: asegura que el token CSRF está cargado (reutilizable)
export const ensureCsrf = async () => {
  if (!api.defaults.headers.common["X-CSRFToken"]) {
    await getCsrf();
  }
};

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
