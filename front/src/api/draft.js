import { api } from "../api";

export const getDraftPlayers = async (draftId) => {
  const res = await api.get(`/draft/${draftId}/players`);
  return res.data;
};

export const startDraft  = (draftId) => api.post(`/draft/${draftId}/start`);
export const finishDraft = (draftId) => api.post(`/draft/${draftId}/finish`);
