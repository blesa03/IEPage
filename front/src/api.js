import axios from "axios";
export const api = axios.create({
  baseURL: "http://localhost:8000/api",
  withCredentials: true,
});

export const login    = (username, password) => api.post("/auth/login",    { username, password });
export const logout   = () => api.post("/auth/logout");
export const me       = async () => (await api.get("/auth/me")).data; // { id, username, role }
export const register = (username, password, role = "player") =>
  api.post("/auth/register", { username, password, role });