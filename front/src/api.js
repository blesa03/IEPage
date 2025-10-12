import axios from "axios";
export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}`,
  withCredentials: true,
});
export const login = (username, password) => api.post("/auth/login", { username, password });
export const logout = () => api.post("/auth/logout");
export const me = async () => (await api.get("/auth/me")).data;
