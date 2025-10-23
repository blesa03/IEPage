import { api, ensureCsrf } from "../api";

/**
 * Devuelve la información pública de un equipo por su ID.
 */
export const viewTeam = async (draftId, teamId) => {
  if (!draftId || !teamId) {
    throw new Error("viewTeam: faltan draftId o teamId");
  }
  const res = await api.get(`/team/${draftId}/${teamId}`);
  return res.data;
};

/**
 * Devuelve el equipo del usuario autenticado (jugadores base).
 */
export const myTeam = async (draftId) => {
  if (!draftId) {
    throw new Error("myTeam: falta draftId");
  }
  const res = await api.get(`/team/${draftId}/my`);
  return res.data;
};

/**
 * Devuelve la alineación activa del usuario (formación, titulares, banquillo, reservas).
 */
export const getLineup = async (draftId) => {
  if (!draftId) {
    throw new Error("getLineup: falta draftId");
  }
  const res = await api.get(`/team/${draftId}/lineup`);
  return res.data;
};

/**
 * Guarda una alineación (formación, orden, coords opcionales).
 * Espera un objeto con:
 * {
 *   formation: "4-4-2",
 *   starters: [{id, order}],
 *   bench: [{id, order}],
 *   reserves: [{id, order}],
 *   coords: { "id": {x, y}, ... }
 * }
 */
export const saveLineup = async (draftId, lineupData) => {
  if (!draftId) throw new Error("saveLineup: falta draftId");
  if (!lineupData) throw new Error("saveLineup: falta lineupData");

  // ✅ Aseguramos que el CSRF está presente antes del PUT
  await ensureCsrf();

  const res = await api.put(`/team/${draftId}/lineup/save`, lineupData);
  return res.data;
};