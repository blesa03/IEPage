import { api } from "../api";

export const getDraftPlayers = async (draftId) => {
  const res = await api.get(`/draft/${draftId}/players`);
  return res.data;
};
export const viewDraft = async(draftId) => {
  const res = await api.get(`/draft/${draftId}`);
  return res.data
}
export const startDraft  = (draftId) => api.put(`/draft/${draftId}/start`);
export const finishDraft = (draftId) => api.put(`/draft/${draftId}/finish`);
export const selectPlayer = (draftId, playerId) =>
  api.put(`/draft/${draftId}/player`, { draft_player_id: playerId });