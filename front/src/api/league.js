// front/src/api/league.js
import { api, ensureCsrf  } from "../api";

// Devuelve las ligas del usuario autenticado
export const getMyLeagues = async () => {
  const res = await api.get("/league/mine");
  return res.data; // [{ id, name, role }, ...]
};

// Crea una liga nueva
export const createLeague = async (name) => {
  await ensureCsrf();
  const res = await api.post("/league/create", { name });
  return res.data;
};

export const getLeague = async (id) => (await api.get(`/league/${id}`)).data;