// src/api/match.js
import { api, ensureCsrf  } from "../api";

export const viewMatchs = async (leagueId) => {
  const res = await api.get(`/games/league/${leagueId}`);
  return res.data;
};

// Estos dos, sin barra final (así están tus urls)
export const viewMatch = async (gameId) => {
  const res = await api.get(`/games/${gameId}`);
  return res.data;
};

export const getMatchResultRequests = async (gameId) => {
  const res = await api.get(`/games/${gameId}/requests`);
  return res.data;
};

export const addMatchResultRequest = async (gameId, payload) => {
  await ensureCsrf();
  const res = await api.post(`/games/${gameId}/requests`, payload);
  return res.data;
};

export const approveMatchResultRequest = async (requestId) => {
  await ensureCsrf();
  const res = await api.put(`/games/${requestId}/approve`);
  return res.data;
};

export const rejectMatchResultRequest = async (requestId) => {
  await ensureCsrf();
  const res = await api.put(`/games/${requestId}/reject`);
  return res.data;
};