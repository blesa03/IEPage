// front/src/api/league.js
import { api } from "../api";

// Devuelve las ligas del usuario autenticado
export const getMyLeagues = async () => {
  const res = await api.get("/league/mine");
  return res.data; // [{ id, name, role }, ...]
};

// Crea una liga nueva
export const createLeague = async (name) => {
  const res = await api.post("/league/create", { name });
  return res.data; // { id, name, ... }
};