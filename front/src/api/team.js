import { api } from "../api";

export const viewTeam = async (draftId, teamId) => {
  if (!draftId || !teamId) {
    throw new Error("viewTeam: faltan draftId o teamId");
  }
  const res = await api.get(`/team/${draftId}/${teamId}`);
  return res.data;
};

export const myTeam = async (draftId) => {
  if (!draftId) {
    throw new Error("myTeam: falta draftId");
  }
  const res = await api.get(`/team/${draftId}/my`);
  return res.data;
};